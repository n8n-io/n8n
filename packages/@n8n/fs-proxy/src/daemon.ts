import * as http from 'node:http';

import { GatewayClient } from './gateway-client';

const DEFAULT_PORT = 7655;

interface DaemonState {
	dir: string;
	client: GatewayClient | null;
	connectedAt: string | null;
	connectedUrl: string | null;
}

const state: DaemonState = {
	dir: '',
	client: null,
	connectedAt: null,
	connectedUrl: null,
};

// HTTP header names don't follow JS naming conventions — build them dynamically
// to satisfy the @typescript-eslint/naming-convention rule.
const CORS_HEADERS: Record<string, string> = {
	['Access-Control-Allow-Origin']: '*',
	['Access-Control-Allow-Methods']: 'GET, POST, OPTIONS',
	['Access-Control-Allow-Headers']: 'Content-Type',
};

function jsonResponse(
	res: http.ServerResponse,
	status: number,
	body: Record<string, unknown>,
): void {
	res.writeHead(status, {
		['Content-Type']: 'application/json',
		...CORS_HEADERS,
	});
	res.end(JSON.stringify(body));
}

async function readBody(req: http.IncomingMessage): Promise<string> {
	return await new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		req.on('data', (chunk: Buffer) => chunks.push(chunk));
		req.on('end', () => resolve(Buffer.concat(chunks).toString()));
		req.on('error', reject);
	});
}

function handleHealth(res: http.ServerResponse): void {
	jsonResponse(res, 200, {
		status: 'ok',
		dir: state.dir,
		connected: state.client !== null,
	});
}

async function handleConnect(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
	const raw = await readBody(req);
	let url: string;
	let token: string;

	try {
		const body = JSON.parse(raw) as { url?: string; token?: string };
		url = body.url ?? '';
		token = body.token ?? '';
	} catch {
		jsonResponse(res, 400, { error: 'Invalid JSON body' });
		return;
	}

	if (!url || !token) {
		jsonResponse(res, 400, { error: 'Missing required fields: url, token' });
		return;
	}

	// Stop existing client if any
	if (state.client) {
		state.client.stop();
		state.client = null;
		state.connectedAt = null;
		state.connectedUrl = null;
	}

	try {
		const client = new GatewayClient({
			url: url.replace(/\/$/, ''),
			apiKey: token,
			dir: state.dir,
		});

		await client.start();

		state.client = client;
		state.connectedAt = new Date().toISOString();
		state.connectedUrl = url;

		console.log(`Connected to n8n at ${url}. Sharing: ${state.dir}`);
		jsonResponse(res, 200, { status: 'connected', dir: state.dir });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`Connection failed: ${message}`);
		jsonResponse(res, 500, { error: message });
	}
}

async function handleDisconnect(res: http.ServerResponse): Promise<void> {
	if (state.client) {
		await state.client.disconnect();
		state.client = null;
		state.connectedAt = null;
		state.connectedUrl = null;
		console.log('Disconnected');
	}
	jsonResponse(res, 200, { status: 'disconnected' });
}

function handleStatus(res: http.ServerResponse): void {
	jsonResponse(res, 200, {
		connected: state.client !== null,
		dir: state.dir,
		connectedAt: state.connectedAt,
		url: state.connectedUrl,
	});
}

function handleEvents(res: http.ServerResponse): void {
	res.writeHead(200, {
		['Content-Type']: 'text/event-stream',
		['Cache-Control']: 'no-cache',
		['Connection']: 'keep-alive',
		...CORS_HEADERS,
	});
	// Send ready event immediately — the daemon is up
	res.write('event: ready\ndata: {}\n\n');
}

function handleCors(res: http.ServerResponse): void {
	res.writeHead(204, {
		...CORS_HEADERS,
		['Access-Control-Max-Age']: '86400',
	});
	res.end();
}

export function startDaemon(dir: string, port: number = DEFAULT_PORT): void {
	state.dir = dir;

	const server = http.createServer((req, res) => {
		const { method, url: reqUrl } = req;

		// CORS preflight
		if (method === 'OPTIONS') {
			handleCors(res);
			return;
		}

		if (method === 'GET' && reqUrl === '/health') {
			handleHealth(res);
		} else if (method === 'POST' && reqUrl === '/connect') {
			void handleConnect(req, res);
		} else if (method === 'POST' && reqUrl === '/disconnect') {
			void handleDisconnect(res);
		} else if (method === 'GET' && reqUrl === '/status') {
			handleStatus(res);
		} else if (method === 'GET' && reqUrl === '/events') {
			handleEvents(res);
		} else {
			jsonResponse(res, 404, { error: 'Not found' });
		}
	});

	server.on('error', (error: NodeJS.ErrnoException) => {
		if (error.code === 'EADDRINUSE') {
			console.error(
				`Error: Port ${String(port)} is already in use. Is another n8n-fs-proxy daemon running?`,
			);
			process.exit(1);
		}
		throw error;
	});

	server.listen(port, '127.0.0.1', () => {
		console.log(`n8n-fs-proxy serving ${dir} on http://127.0.0.1:${String(port)}`);
		console.log('n8n will auto-connect when you open the AI assistant.');
	});

	// Graceful shutdown
	const shutdown = () => {
		console.log('\nShutting down...');
		const done = () => server.close(() => process.exit(0));
		if (state.client) {
			void state.client.disconnect().finally(done);
		} else {
			done();
		}
	};
	process.on('SIGINT', shutdown);
	process.on('SIGTERM', shutdown);
}
