import * as fs from 'node:fs/promises';
import * as http from 'node:http';

import type { GatewayConfig } from './config';
import { GatewayClient } from './gateway-client';
import { GatewaySession } from './gateway-session';
import {
	logger,
	printConnected,
	printDisconnected,
	printListening,
	printShuttingDown,
	printToolList,
	printWaiting,
} from './logger';
import { SettingsStore } from './settings-store';
import type { ConfirmResourceAccess } from './tools/types';

export type { ConfirmResourceAccess, ResourceDecision } from './tools/types';

export interface DaemonOptions {
	/** Called before a new connection. Receives a pre-seeded session; may mutate it. Return false to reject with HTTP 403. */
	confirmConnect: (url: string, session: GatewaySession) => Promise<boolean> | boolean;
	/** Called when a tool is about to access a resource that requires confirmation. */
	confirmResourceAccess: ConfirmResourceAccess;
	/** Called after connect/disconnect for status propagation (e.g. Electron tray). */
	onStatusChange?: (status: 'connected' | 'disconnected', url?: string) => void;
	/**
	 * When true, skip SIGINT/SIGTERM process handlers.
	 * Use this when the host process (e.g. Electron) manages its own shutdown.
	 */
	managedMode?: boolean;
}

// Populated by startDaemon before the server handles any requests
let daemonOptions!: DaemonOptions;
let settingsStore: SettingsStore | null = null;
let settingsStorePromise: Promise<SettingsStore>;

interface DaemonState {
	config: GatewayConfig;
	client: GatewayClient | null;
	session: GatewaySession | null;
	connectedAt: string | null;
	connectedUrl: string | null;
	confirmingConnection: boolean;
}

const state: DaemonState = {
	config: undefined as unknown as GatewayConfig,
	client: null,
	session: null,
	connectedAt: null,
	connectedUrl: null,
	confirmingConnection: false,
};

// ---------------------------------------------------------------------------
// Origin matching — supports wildcard patterns like https://*.app.n8n.cloud
// ---------------------------------------------------------------------------

function matchesOriginPattern(pattern: string, origin: string): boolean {
	if (!pattern.includes('*')) {
		try {
			return new URL(pattern).origin === new URL(origin).origin;
		} catch {
			return false;
		}
	}

	let originUrl: URL;
	try {
		originUrl = new URL(origin);
	} catch {
		return false;
	}

	// Parse pattern manually — URL constructor rejects wildcards in hostnames
	const schemeMatch = /^([a-z][a-z0-9+\-.]*):\/\/(.+)$/.exec(pattern);
	if (!schemeMatch) return false;
	const [, patternScheme, patternAuthority] = schemeMatch;

	if (originUrl.protocol !== `${patternScheme}:`) return false;

	// Split authority into hostname and optional port
	const colonIdx = patternAuthority.lastIndexOf(':');
	const hasPort = colonIdx > patternAuthority.lastIndexOf('*');
	const patternHostname = hasPort ? patternAuthority.slice(0, colonIdx) : patternAuthority;
	const patternPort = hasPort ? patternAuthority.slice(colonIdx + 1) : '';

	if (patternPort && originUrl.port !== patternPort) return false;
	if (!patternPort && originUrl.port !== '') return false;

	// Match hostname — * expands to any depth of subdomains
	const escapedParts = patternHostname
		.split('*')
		.map((s) => s.replace(/[.+^${}()|[\]\\]/g, '\\$&'));
	return new RegExp(`^${escapedParts.join('.+')}$`).test(originUrl.hostname);
}

export function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
	return allowedOrigins.some((pattern) => matchesOriginPattern(pattern, origin));
}

// ---------------------------------------------------------------------------
// CORS helpers — echo the request Origin when it matches allowedOrigins
// ---------------------------------------------------------------------------

function getCorsHeaders(
	reqOrigin: string | undefined,
	allowedOrigins: string[],
): Record<string, string> {
	const base: Record<string, string> = {
		['Access-Control-Allow-Methods']: 'GET, POST, OPTIONS',
		['Access-Control-Allow-Headers']: 'Content-Type',
	};
	if (reqOrigin && isOriginAllowed(reqOrigin, allowedOrigins)) {
		return { ...base, ['Access-Control-Allow-Origin']: reqOrigin, ['Vary']: 'Origin' };
	}
	// No ACAO — browsers will block cross-origin requests from non-matching origins
	return base;
}

function jsonResponse(
	req: http.IncomingMessage,
	res: http.ServerResponse,
	status: number,
	body: Record<string, unknown>,
): void {
	res.writeHead(status, {
		['Content-Type']: 'application/json',
		...getCorsHeaders(req.headers.origin, state.config.allowedOrigins),
	});
	res.end(JSON.stringify(body));
}

function getDir(): string {
	return state.session?.dir ?? state.config.filesystem.dir;
}

async function readBody(req: http.IncomingMessage): Promise<string> {
	return await new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		req.on('data', (chunk: Buffer) => chunks.push(chunk));
		req.on('end', () => resolve(Buffer.concat(chunks).toString()));
		req.on('error', reject);
	});
}

function handleHealth(req: http.IncomingMessage, res: http.ServerResponse): void {
	jsonResponse(req, res, 200, {
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
		jsonResponse(req, res, 400, { error: 'Invalid JSON body' });
		return;
	}

	if (!url || !token) {
		jsonResponse(req, res, 400, { error: 'Missing required fields: url, token' });
		return;
	}

	// Reject if already connected
	if (state.client) {
		jsonResponse(req, res, 409, {
			error: `Already connected to ${state.connectedUrl}. Disconnect first.`,
		});
		return;
	}

	// Reject concurrent connection attempts while a confirmation prompt is active
	if (state.confirmingConnection) {
		jsonResponse(req, res, 409, { error: 'A connection confirmation is already in progress.' });
		return;
	}

	let parsedOrigin: string;
	try {
		parsedOrigin = new URL(url).origin;
	} catch {
		jsonResponse(req, res, 400, { error: 'Invalid URL' });
		return;
	}

	// Silently refuse connections from origins not in the allowlist.
	// Only matching origins proceed to the user confirmation prompt.
	if (!isOriginAllowed(parsedOrigin, state.config.allowedOrigins)) {
		logger.debug('Connection rejected: origin not in allowlist', {
			url,
			allowedOrigins: state.config.allowedOrigins,
		});
		jsonResponse(req, res, 403, { error: 'Connection rejected.' });
		return;
	}

	try {
		const store = settingsStore ?? (await settingsStorePromise);
		settingsStore ??= store;

		const defaults = store.getDefaults(state.config);
		const session = new GatewaySession(defaults, store);

		state.confirmingConnection = true;
		let approved: boolean;
		try {
			approved = await daemonOptions.confirmConnect(url, session);
		} finally {
			state.confirmingConnection = false;
		}
		if (!approved) {
			jsonResponse(req, res, 403, { error: 'Connection rejected by user.' });
			return;
		}

		// Validate the directory the session resolved to
		try {
			const stat = await fs.stat(session.dir);
			if (!stat.isDirectory()) {
				jsonResponse(req, res, 400, { error: `Invalid directory: ${session.dir}` });
				return;
			}
		} catch {
			jsonResponse(req, res, 400, { error: `Invalid directory: ${session.dir}` });
			return;
		}

		state.session = session;

		const client = new GatewayClient({
			url: url.replace(/\/$/, ''),
			apiKey: token,
			config: state.config,
			session,
			confirmResourceAccess: daemonOptions.confirmResourceAccess,
			onPersistentFailure: () => {
				clearConnectionState();
				printDisconnected();
			},
			onDisconnected: () => {
				clearConnectionState();
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
		jsonResponse(req, res, 200, { status: 'connected', dir });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logger.error('Connection failed', { error: message });
		jsonResponse(req, res, 500, { error: message });
	}
}

/**
 * Reset all per-connection daemon state. Invoked by the GatewayClient via its
 * onDisconnected hook, so every teardown path (HTTP /disconnect, SSE
 * gateway-disconnect event, persistent auth failure) converges here.
 */
function clearConnectionState(): void {
	if (!state.client && !state.session && !state.connectedAt && !state.connectedUrl) return;
	state.client = null;
	state.session = null;
	state.connectedAt = null;
	state.connectedUrl = null;
	logger.debug('Disconnected');
	daemonOptions.onStatusChange?.('disconnected');
}

async function handleDisconnect(
	req: http.IncomingMessage,
	res: http.ServerResponse,
): Promise<void> {
	if (state.client) {
		await state.client.disconnect();
	}
	jsonResponse(req, res, 200, { status: 'disconnected' });
}

function handleStatus(req: http.IncomingMessage, res: http.ServerResponse): void {
	jsonResponse(req, res, 200, {
		connected: state.client !== null,
		dir: getDir(),
		connectedAt: state.connectedAt,
		url: state.connectedUrl,
	});
}

function handleEvents(req: http.IncomingMessage, res: http.ServerResponse): void {
	res.writeHead(200, {
		['Content-Type']: 'text/event-stream',
		['Cache-Control']: 'no-cache',
		['Connection']: 'keep-alive',
		...getCorsHeaders(req.headers.origin, state.config.allowedOrigins),
	});
	// Send ready event immediately — the daemon is up
	res.write('event: ready\ndata: {}\n\n');
}

function handleCors(req: http.IncomingMessage, res: http.ServerResponse): void {
	const reqOrigin = req.headers.origin;
	if (!reqOrigin || !isOriginAllowed(reqOrigin, state.config.allowedOrigins)) {
		res.writeHead(403);
		res.end();
		return;
	}
	res.writeHead(204, {
		...getCorsHeaders(reqOrigin, state.config.allowedOrigins),
		['Access-Control-Max-Age']: '86400',
	});
	res.end();
}

export function startDaemon(config: GatewayConfig, options: DaemonOptions): http.Server {
	daemonOptions = options;
	state.config = config;
	const port = config.port;

	// SettingsStore is initialized asynchronously; the server starts immediately.
	// handleConnect awaits this promise before proceeding, eliminating the race condition.
	settingsStorePromise = SettingsStore.create();
	void settingsStorePromise
		.then((store) => {
			settingsStore = store;
		})
		.catch((error: unknown) => {
			logger.error('Failed to initialize settings store', {
				error: error instanceof Error ? error.message : String(error),
			});
			process.exit(1);
		});

	const server = http.createServer((req, res) => {
		const { method, url: reqUrl } = req;

		// CORS preflight
		if (method === 'OPTIONS') {
			handleCors(req, res);
			return;
		}

		// Reject requests with a missing or non-matching Origin to prevent CSRF via simple requests.
		const reqOrigin = req.headers.origin;
		if (!reqOrigin || !isOriginAllowed(reqOrigin, state.config.allowedOrigins)) {
			logger.debug('Request rejected: origin not in allowlist', {
				origin: reqOrigin,
				allowedOrigins: state.config.allowedOrigins,
			});
			jsonResponse(req, res, 403, { error: 'Forbidden.' });
			return;
		}

		if (method === 'GET' && reqUrl === '/health') {
			handleHealth(req, res);
		} else if (method === 'POST' && reqUrl === '/connect') {
			void handleConnect(req, res);
		} else if (method === 'POST' && reqUrl === '/disconnect') {
			void handleDisconnect(req, res);
		} else if (method === 'GET' && reqUrl === '/status') {
			handleStatus(req, res);
		} else if (method === 'GET' && reqUrl === '/events') {
			handleEvents(req, res);
		} else {
			jsonResponse(req, res, 404, { error: 'Not found' });
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
		printListening(port);
		printWaiting();
	});

	// Graceful shutdown — only in standalone (non-managed) mode
	if (!options.managedMode) {
		const shutdown = () => {
			printShuttingDown();
			const done = () => server.close(() => process.exit(0));
			const flush = settingsStore ? settingsStore.flush() : Promise.resolve();
			if (state.client) {
				void Promise.all([state.client.disconnect(), flush]).finally(done);
			} else {
				void flush.finally(done);
			}
		};
		process.on('SIGINT', shutdown);
		process.on('SIGTERM', shutdown);
	}

	return server;
}
