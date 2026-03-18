import * as http from 'node:http';

import type { ResolvedGatewayConfig } from './config';
import { GatewayClient } from './gateway-client';
import {
	logger,
	printBanner,
	printConnected,
	printDisconnected,
	printListening,
	printModuleStatus,
	printToolList,
	printShuttingDown,
	printWaiting,
} from './logger';

export interface DaemonOptions {
	/**
	 * Called before a new connection. Return false to reject with HTTP 403.
	 * If omitted, falls back to a CLI readline prompt.
	 */
	confirmConnect?: (url: string) => Promise<boolean>;
	/** Called after connect/disconnect for status propagation (e.g. Electron tray). */
	onStatusChange?: (status: 'connected' | 'disconnected', url?: string) => void;
	/**
	 * When true, skip SIGINT/SIGTERM process handlers.
	 * Use this when the host process (e.g. Electron) manages its own shutdown.
	 */
	managedMode?: boolean;
}

let daemonOptions: DaemonOptions = {};

async function cliConfirmConnect(url: string): Promise<boolean> {
	const readline = await import('node:readline');
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
	return await new Promise((resolve) => {
		rl.question(`\nIncoming connection request from: ${url}\nAllow? [Y/n]: `, (answer) => {
			rl.close();
			const normalized = answer.trim().toLowerCase();
			resolve(normalized === '' || normalized === 'y' || normalized === 'yes');
		});
	});
}

interface DaemonState {
	config: ResolvedGatewayConfig;
	client: GatewayClient | null;
	connectedAt: string | null;
	connectedUrl: string | null;
}

const state: DaemonState = {
	config: undefined as unknown as ResolvedGatewayConfig,
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

function getDir(): string {
	const fs = state.config.filesystem;
	return fs !== false ? fs.dir : process.cwd();
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
		dir: getDir(),
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

	// Reject if already connected
	if (state.client) {
		jsonResponse(res, 409, {
			error: `Already connected to ${state.connectedUrl}. Disconnect first.`,
		});
		return;
	}

	// Check allowedOrigins — skip confirmation for trusted URLs
	const isAllowed = state.config.allowedOrigins.some((origin) => url.startsWith(origin));

	if (!isAllowed) {
		const confirm = daemonOptions.confirmConnect ?? cliConfirmConnect;
		const approved = await confirm(url);
		if (!approved) {
			jsonResponse(res, 403, { error: 'Connection rejected by user.' });
			return;
		}
	}

	try {
		const client = new GatewayClient({
			url: url.replace(/\/$/, ''),
			apiKey: token,
			config: state.config,
			onPersistentFailure: () => {
				state.client = null;
				state.connectedAt = null;
				state.connectedUrl = null;
				printDisconnected();
			},
		});

		await client.start();

		state.client = client;
		state.connectedAt = new Date().toISOString();
		state.connectedUrl = url;

		const dir = getDir();
		logger.debug('Connected to n8n', { url, dir });
		printConnected(url);
		printToolList(client.tools);
		daemonOptions.onStatusChange?.('connected', url);
		jsonResponse(res, 200, { status: 'connected', dir });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logger.error('Connection failed', { error: message });
		jsonResponse(res, 500, { error: message });
	}
}

async function handleDisconnect(res: http.ServerResponse): Promise<void> {
	if (state.client) {
		await state.client.disconnect();
		state.client = null;
		state.connectedAt = null;
		state.connectedUrl = null;
		logger.debug('Disconnected');
		printDisconnected();
		daemonOptions.onStatusChange?.('disconnected');
	}
	jsonResponse(res, 200, { status: 'disconnected' });
}

function handleStatus(res: http.ServerResponse): void {
	jsonResponse(res, 200, {
		connected: state.client !== null,
		dir: getDir(),
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

export function startDaemon(
	config: ResolvedGatewayConfig,
	options: DaemonOptions = {},
): http.Server {
	daemonOptions = options;
	state.config = config;
	const port = config.port;

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
			logger.error('Port already in use', { port });
			process.exit(1);
		}
		throw error;
	});

	server.listen(port, '127.0.0.1', () => {
		printBanner();
		printModuleStatus(config);
		printListening(port);
		printWaiting();
	});

	// Graceful shutdown — only in standalone (non-managed) mode
	if (!options.managedMode) {
		const shutdown = () => {
			printShuttingDown();
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

	return server;
}
