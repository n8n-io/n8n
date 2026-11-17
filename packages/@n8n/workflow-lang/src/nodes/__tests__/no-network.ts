/**
 * A guard for every harness that runs v1 node code: no connection leaves the machine.
 *
 * A harness replaces the HTTP clients that it knows (n8n's `OutboundHttp`, the global
 * `fetch`). A node can still reach the network through a client that the harness does not
 * know: a client with its own undici dispatcher, axios, `https.request`. The guard works
 * below all of them:
 * - `net.Socket.prototype.connect` throws for a host that is not a loopback address. TCP and
 *   TLS connections of Node.js, undici and axios all start there.
 * - `dns.lookup` throws for a name that is not `localhost`, so no name goes to a resolver.
 * - The global undici dispatcher is a `MockAgent` without network connections, when the
 *   undici of n8n loads and the `fetch` of this Node.js accepts it.
 *
 * Loopback stays open: the recorder has a probe server on 127.0.0.1, and the SQL tests have
 * fake database servers there.
 */
import dns from 'node:dns';
import { createRequire } from 'node:module';
import net from 'node:net';

const LOOPBACK_NAMES = new Set(['localhost', 'localhost.', '::1', '[::1]', '0:0:0:0:0:0:0:1']);

/** True for `localhost`, 127.0.0.0/8 and ::1. */
export function isLoopback(host: string): boolean {
	const name = host.toLowerCase();
	if (LOOPBACK_NAMES.has(name)) return true;
	if (name.startsWith('::ffff:')) return isLoopback(name.slice('::ffff:'.length));
	const parts = name.split('.');
	return (
		parts.length === 4 &&
		parts[0] === '127' &&
		parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)
	);
}

/** The error of a blocked connection. Its message names the host. */
export class NetworkBlockedError extends Error {
	readonly code = 'ENETWORKBLOCKED';

	readonly host: string;

	constructor(host: string, what: string) {
		super(
			`A test tried to reach the network (${what} "${host}"). Code that runs v1 nodes must not connect to a host that is not loopback: answer the request from the case.`,
		);
		this.name = 'NetworkBlockedError';
		this.host = host;
	}
}

/** What the guard saw since it was installed. */
export const networkGuard = {
	installed: false,
	/** The global undici dispatcher is a MockAgent without network connections. */
	mockAgent: false,
	/** Hosts of blocked connections and lookups, in order. */
	blocked: [] as string[],
	/** Lookups that went to the real resolver (loopback names only). */
	lookups: 0,
};

interface ConnectTarget {
	host?: unknown;
	port?: unknown;
	path?: unknown;
}

/** The target of `socket.connect(...)` in each of its call forms. */
function targetOf(args: unknown[]): ConnectTarget {
	let first = args[0];
	// The internal form: one array of normalized arguments.
	if (Array.isArray(first)) first = first[0];
	if (typeof first === 'object' && first !== null) return first as ConnectTarget;
	if (typeof first === 'string' && Number.isNaN(Number(first))) return { path: first };
	return { port: first, host: typeof args[1] === 'string' ? args[1] : undefined };
}

type Lookup = (hostname: string, ...rest: unknown[]) => unknown;

/** Installs the guard for the life of the process. A second call does nothing. */
export function installNetworkGuard(): void {
	if (networkGuard.installed) return;
	networkGuard.installed = true;

	const connect = net.Socket.prototype.connect as (this: net.Socket, ...args: unknown[]) => unknown;
	net.Socket.prototype.connect = function (this: net.Socket, ...args: unknown[]) {
		const target = targetOf(args);
		// A path is a pipe or a Unix socket on this machine.
		if (target.path === undefined) {
			const host =
				typeof target.host === 'string' && target.host !== '' ? target.host : 'localhost';
			if (!isLoopback(host)) {
				networkGuard.blocked.push(host);
				throw new NetworkBlockedError(host, 'a connection to');
			}
		}
		return connect.apply(this, args);
	} as typeof net.Socket.prototype.connect;

	const guardLookup = (real: Lookup): Lookup =>
		function (this: unknown, hostname: string, ...rest: unknown[]) {
			if (typeof hostname === 'string' && !isLoopback(hostname)) {
				networkGuard.blocked.push(hostname);
				throw new NetworkBlockedError(hostname, 'a DNS lookup of');
			}
			networkGuard.lookups++;
			return real.call(this, hostname, ...rest);
		};
	dns.lookup = guardLookup(dns.lookup as unknown as Lookup) as unknown as typeof dns.lookup;
	dns.promises.lookup = guardLookup(
		dns.promises.lookup as unknown as Lookup,
	) as unknown as typeof dns.promises.lookup;

	installMockAgent();
}

/** The undici of n8n: from this package, or from the packages that the fallback host loads. */
function loadUndici(): unknown {
	const here = createRequire(import.meta.url);
	const host = () => createRequire(here.resolve('../../../../workflow-fallback-host/package.json'));
	const through =
		(...names: string[]) =>
		() => {
			let require = host();
			for (const name of names) require = createRequire(require.resolve(name));
			return require;
		};
	const bases: Array<() => NodeJS.Require> = [
		() => here,
		host,
		through('n8n-core', '@n8n/backend-network'),
		through('@n8n/n8n-nodes-langchain/package.json', '@n8n/ai-utilities'),
	];
	for (const base of bases) {
		try {
			return base()('undici');
		} catch {}
	}
	throw new Error('undici is not installed');
}

/**
 * Sets a `MockAgent` without network connections as the global undici dispatcher. Node.js
 * can refuse a dispatcher of another undici than its own; the guard then keeps the
 * dispatcher that was there, and the socket guard above still holds.
 */
function installMockAgent(): void {
	try {
		const undici = loadUndici() as {
			MockAgent: new () => {
				disableNetConnect(): void;
				enableNetConnect(match: (host: string) => boolean): void;
			};
			setGlobalDispatcher(agent: unknown): void;
			getGlobalDispatcher(): unknown;
		};
		const before = undici.getGlobalDispatcher();
		const agent = new undici.MockAgent();
		agent.disableNetConnect();
		agent.enableNetConnect((host) => isLoopback(host.replace(/:\d+$/, '')));
		undici.setGlobalDispatcher(agent);
		networkGuard.mockAgent = true;
		void before;
	} catch {
		networkGuard.mockAgent = false;
	}
}
