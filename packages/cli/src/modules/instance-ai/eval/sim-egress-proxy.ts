import type { Logger } from '@n8n/backend-common';
import {
	createServer,
	request as httpRequest,
	type IncomingMessage,
	type Server,
	type ServerResponse,
} from 'node:http';
import { request as httpsRequest } from 'node:https';
import { connect, type Socket } from 'node:net';

/** `host:port` of the sim server's HTTPS listener. */
export interface SimGateway {
	host: string;
	port: number;
}

export function parseSimGateway(value: string): SimGateway | undefined {
	const match = /^\[?([^\]]+?)\]?:(\d+)$/.exec(value.trim());
	if (!match) return undefined;
	return { host: match[1], port: Number(match[2]) };
}

/**
 * Whether the sim server serves `host`. Patterns come from its manifests: exact hosts,
 * and hosts where `*` or a `{name}` template stands for one part of a DNS label
 * (`*.myshopify.com`, `{subdomain}.zendesk.com`, `*-aiplatform.googleapis.com`).
 */
export function isSimHost(host: string, patterns: readonly string[]): boolean {
	const h = host.toLowerCase();
	return patterns.some((raw) => {
		const pattern = raw.toLowerCase();
		if (pattern.startsWith('*.') && h === pattern.slice(2)) return true;
		if (!pattern.includes('.') || !/[*{]/.test(pattern)) return h === pattern;
		const source = pattern
			.split(/(\*|\{[^{}.]+\})/)
			.map((part, i) => (i % 2 === 1 ? '[a-z0-9-]+' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
			.join('');
		return new RegExp(`^${source}$`).test(h);
	});
}

const LOOPBACK = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/** Path prefix for AI SDK calls: `/sim/<host>/<path>` reaches `https://<host>/<path>`. */
const FORWARD_PREFIX = '/sim/';

/**
 * The egress of one simulated-services eval run, on a loopback port.
 *
 * Node requests arrive as proxy traffic (core sets this proxy on every request of the
 * run): a CONNECT to a host the sim server serves is tunnelled to it unchanged, so
 * Host, SNI and request signatures stay as in production. AI SDK calls arrive on
 * `/sim/<host>/...`, because the run points their credential's base URL here, and go
 * on to the sim server over TLS for that host. The instance's own port on loopback is
 * reached directly. Any other target is refused and recorded: the run cannot
 * simulate it.
 */
export class SimEgressProxy {
	private server?: Server;
	private readonly sockets = new Set<Socket>();
	/** Hosts the run tried to reach that the sim server does not serve. */
	readonly refusedHosts = new Set<string>();

	constructor(
		private readonly gateway: SimGateway,
		private readonly simHosts: readonly string[],
		/** Loopback ports the run may reach directly: the instance's own. */
		private readonly loopbackPorts: readonly number[],
		private readonly logger: Logger,
	) {}

	async start(): Promise<string> {
		const server = createServer((req, res) => this.handleRequest(req, res));
		server.on('connect', (req: IncomingMessage, socket: Socket, head: Buffer) =>
			this.handleConnect(req, socket, head),
		);
		server.on('connection', (socket) => {
			this.sockets.add(socket);
			socket.on('close', () => this.sockets.delete(socket));
		});
		this.server = server;
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		const address = server.address();
		if (!address || typeof address === 'string') throw new Error('Sim egress proxy has no port');
		return `http://127.0.0.1:${address.port}`;
	}

	async stop(): Promise<void> {
		for (const socket of this.sockets) socket.destroy();
		const server = this.server;
		this.server = undefined;
		if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
	}

	private handleConnect(req: IncomingMessage, client: Socket, head: Buffer): void {
		const [host, portText] = splitHostPort(req.url ?? '');
		const port = Number(portText) || 443;
		const loopback = LOOPBACK.has(host);
		const target = loopback
			? this.loopbackPorts.includes(port)
				? { host, port }
				: undefined
			: isSimHost(host, this.simHosts)
				? this.gateway
				: undefined;
		if (!target) {
			this.refuse(loopback ? `${host}:${port}` : host);
			client.end('HTTP/1.1 502 Not Served By The Simulation\r\n\r\n');
			return;
		}
		const upstream = connect(target.port, target.host, () => {
			client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
			if (head.length > 0) upstream.write(head);
			upstream.pipe(client);
			client.pipe(upstream);
		});
		this.sockets.add(upstream);
		upstream.on('close', () => this.sockets.delete(upstream));
		upstream.on('error', (error) => {
			this.logger.warn(`[EvalSim] Tunnel to ${host} failed: ${error.message}`);
			client.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
		});
		client.on('error', () => upstream.destroy());
	}

	private handleRequest(req: IncomingMessage, res: ServerResponse): void {
		const url = req.url ?? '/';
		// Absolute-form: a plain-HTTP request sent through the proxy.
		if (/^https?:\/\//i.test(url)) {
			const target = new URL(url);
			if (LOOPBACK.has(target.hostname)) {
				const port = Number(target.port) || 80;
				if (this.loopbackPorts.includes(port)) {
					this.forwardDirect(target, req, res);
					return;
				}
				this.refuse(`${target.hostname}:${port}`);
				res.writeHead(502).end(`${target.host} is not served by the simulated services`);
				return;
			}
			this.forward(target.host, `${target.pathname}${target.search}`, req, res);
			return;
		}
		if (url.startsWith(FORWARD_PREFIX)) {
			const rest = url.slice(FORWARD_PREFIX.length);
			const slash = rest.search(/[/?]/);
			const authority = slash === -1 ? rest : rest.slice(0, slash);
			const path = slash === -1 ? '/' : rest.slice(slash);
			this.forward(authority, path.startsWith('/') ? path : `/${path}`, req, res);
			return;
		}
		res.writeHead(404).end();
	}

	/** Sends a request to the sim server over TLS for `authority` (`host[:port]`), as `https://<authority><path>`. */
	private forward(
		authority: string,
		path: string,
		req: IncomingMessage,
		res: ServerResponse,
	): void {
		const [host] = splitHostPort(authority);
		if (!isSimHost(host, this.simHosts)) {
			this.refuse(host);
			res.writeHead(502).end(`${host} is not served by the simulated services`);
			return;
		}
		// `proxy-connection` belongs to the hop into this proxy, not to the request.
		const { 'proxy-connection': _hop, ...forwarded } = req.headers;
		const headers = { ...forwarded, host: authority };
		const upstream = httpsRequest(
			{
				host: this.gateway.host,
				port: this.gateway.port,
				servername: host,
				method: req.method,
				path,
				headers,
			},
			(response) => {
				res.writeHead(response.statusCode ?? 502, response.headers);
				response.pipe(res);
			},
		);
		upstream.on('error', (error) => {
			this.logger.warn(`[EvalSim] Request to ${host} failed: ${error.message}`);
			if (!res.headersSent) res.writeHead(502);
			res.end();
		});
		req.pipe(upstream);
	}

	/** Plain HTTP to a loopback target (the instance itself), reached directly as in production. */
	private forwardDirect(target: URL, req: IncomingMessage, res: ServerResponse): void {
		const upstream = httpRequest(
			{
				host: target.hostname,
				port: Number(target.port) || 80,
				method: req.method,
				path: `${target.pathname}${target.search}`,
				headers: { ...req.headers, host: target.host },
			},
			(response) => {
				res.writeHead(response.statusCode ?? 502, response.headers);
				response.pipe(res);
			},
		);
		upstream.on('error', () => {
			if (!res.headersSent) res.writeHead(502);
			res.end();
		});
		req.pipe(upstream);
	}

	private refuse(host: string): void {
		if (!this.refusedHosts.has(host)) {
			this.logger.debug(`[EvalSim] Refused ${host}: not served by the simulated services`);
		}
		this.refusedHosts.add(host);
	}
}

function splitHostPort(value: string): [string, string] {
	const match = /^\[?([^\]]+?)\]?:(\d+)$/.exec(value);
	return match ? [match[1].toLowerCase(), match[2]] : [value.toLowerCase(), ''];
}
