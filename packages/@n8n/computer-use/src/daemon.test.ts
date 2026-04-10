/**
 * Integration-style tests for the daemon HTTP server.
 *
 * The daemon uses module-level singletons (state, settingsStore, daemonOptions).
 * Each test starts a fresh server on a random port and closes it afterwards.
 * jest.resetModules() is used between suites to clear singleton state.
 */

import * as fs from 'node:fs/promises';
import * as http from 'node:http';
import * as os from 'node:os';
import * as path from 'node:path';

// ---------------------------------------------------------------------------
// Module-level mocks — must be declared before imports
// ---------------------------------------------------------------------------

jest.mock('node:os', () => {
	const actual = jest.requireActual<typeof os>('node:os');
	return { ...actual, homedir: jest.fn(() => actual.homedir()) };
});

// Prevent GatewayClient.start() from making real network calls
jest.mock('./gateway-client', () => ({
	['GatewayClient']: jest.fn().mockImplementation(() => ({
		start: jest.fn().mockResolvedValue(undefined),
		disconnect: jest.fn().mockResolvedValue(undefined),
		tools: [],
	})),
}));

// Suppress logger noise during tests
jest.mock('./logger', () => ({
	logger: { debug: jest.fn(), info: jest.fn(), error: jest.fn(), warn: jest.fn() },
	configure: jest.fn(),
	printBanner: jest.fn(),
	printConnected: jest.fn(),
	printDisconnected: jest.fn(),
	printListening: jest.fn(),
	printShuttingDown: jest.fn(),
	printToolList: jest.fn(),
	printWaiting: jest.fn(),
	printReconnecting: jest.fn(),
	printAuthFailure: jest.fn(),
	printReinitializing: jest.fn(),
	printReinitFailed: jest.fn(),
}));

import type { GatewayConfig } from './config';
import type { DaemonOptions } from './daemon';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseJson<T>(raw: string): T {
	try {
		return JSON.parse(raw) as T;
	} catch {
		throw new Error(`Failed to parse JSON: ${raw}`);
	}
}

const BASE_CONFIG: GatewayConfig = {
	logLevel: 'silent',
	port: 0, // bind to OS-assigned port
	allowedOrigins: [],
	filesystem: { dir: '/' },
	computer: { shell: { timeout: 30_000 } },
	browser: { defaultBrowser: 'chrome' },
	permissions: {},
	permissionConfirmation: 'instance',
};

type JsonBody = Record<string, unknown>;

async function post(
	port: number,
	urlPath: string,
	body: JsonBody = {},
): Promise<{ status: number; body: JsonBody }> {
	return await new Promise((resolve, reject) => {
		const payload = JSON.stringify(body);
		const req = http.request(
			{
				hostname: '127.0.0.1',
				port,
				path: urlPath,
				method: 'POST',
				headers: {
					['Content-Type']: 'application/json',
					['Content-Length']: Buffer.byteLength(payload),
				},
			},
			(res) => {
				const chunks: Buffer[] = [];
				res.on('data', (c: Buffer) => chunks.push(c));
				res.on('end', () =>
					resolve({
						status: res.statusCode ?? 0,
						body: parseJson<JsonBody>(Buffer.concat(chunks).toString()),
					}),
				);
			},
		);
		req.on('error', reject);
		req.end(payload);
	});
}

async function get(port: number, urlPath: string): Promise<{ status: number; body: JsonBody }> {
	return await new Promise((resolve, reject) => {
		http
			.get({ hostname: '127.0.0.1', port, path: urlPath }, (res) => {
				const chunks: Buffer[] = [];
				res.on('data', (c: Buffer) => chunks.push(c));
				res.on('end', () =>
					resolve({
						status: res.statusCode ?? 0,
						body: parseJson<JsonBody>(Buffer.concat(chunks).toString()),
					}),
				);
			})
			.on('error', reject);
	});
}

async function listenPort(server: http.Server): Promise<number> {
	return await new Promise((resolve) => {
		server.once('listening', () => {
			const addr = server.address();
			resolve(typeof addr === 'object' && addr !== null ? addr.port : 0);
		});
	});
}

// ---------------------------------------------------------------------------
// Per-test setup: isolated tmpDir + settings file + fresh module instance
// ---------------------------------------------------------------------------

let tmpDir: string;

beforeEach(async () => {
	jest.resetModules();
	tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'daemon-test-'));
	(os.homedir as jest.Mock).mockReturnValue(tmpDir);
	// Write a minimal valid settings file so SettingsStore loads cleanly
	const dir = path.join(tmpDir, '.n8n-gateway');
	await fs.mkdir(dir, { recursive: true });
	await fs.writeFile(
		path.join(dir, 'settings.json'),
		JSON.stringify({ permissions: {}, resourcePermissions: {} }),
		'utf-8',
	);
});

afterEach(async () => {
	jest.restoreAllMocks();
	await fs.rm(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Helper to start a daemon for a single test
// ---------------------------------------------------------------------------

async function startTestDaemon(
	configOverride: Partial<GatewayConfig> = {},
	optionsOverride: Partial<DaemonOptions> = {},
): Promise<{ port: number; server: http.Server; close: () => Promise<void> }> {
	// Re-require after resetModules so each test gets a clean singleton
	const { startDaemon } = await import('./daemon');

	const config: GatewayConfig = { ...BASE_CONFIG, ...configOverride };
	const options: DaemonOptions = {
		managedMode: true, // prevent SIGINT/SIGTERM handlers
		confirmConnect: jest.fn().mockResolvedValue(true),
		confirmResourceAccess: jest.fn().mockReturnValue('denyOnce'),
		...optionsOverride,
	};

	const server = startDaemon(config, options);
	const port = await listenPort(server);
	const close = async () => await new Promise<void>((resolve) => server.close(() => resolve()));

	return { port, server, close };
}

// ---------------------------------------------------------------------------
// GET /health
// ---------------------------------------------------------------------------

describe('GET /health', () => {
	it('returns status ok and connected: false when no client is connected', async () => {
		const { port, close } = await startTestDaemon();
		try {
			const res = await get(port, '/health');
			expect(res.status).toBe(200);
			expect(res.body.status).toBe('ok');
			expect(res.body.connected).toBe(false);
		} finally {
			await close();
		}
	});
});

// ---------------------------------------------------------------------------
// POST /connect — validation
// ---------------------------------------------------------------------------

describe('POST /connect — validation', () => {
	it('returns 400 for missing url and token', async () => {
		const { port, close } = await startTestDaemon();
		try {
			const res = await post(port, '/connect', {});
			expect(res.status).toBe(400);
		} finally {
			await close();
		}
	});

	it('returns 400 for invalid JSON body', async () => {
		const { port, close } = await startTestDaemon();
		try {
			const status = await new Promise<number>((resolve, reject) => {
				const payload = 'not-json';
				const req = http.request(
					{
						hostname: '127.0.0.1',
						port,
						path: '/connect',
						method: 'POST',
						headers: {
							['Content-Type']: 'application/json',
							['Content-Length']: Buffer.byteLength(payload),
						},
					},
					(r) => {
						r.resume();
						resolve(r.statusCode ?? 0);
					},
				);
				req.on('error', reject);
				req.end(payload);
			});
			expect(status).toBe(400);
		} finally {
			await close();
		}
	});

	it('returns 400 for an invalid URL', async () => {
		const { port, close } = await startTestDaemon();
		try {
			const res = await post(port, '/connect', { url: 'not-a-url', token: 'tok' });
			expect(res.status).toBe(400);
		} finally {
			await close();
		}
	});
});

// ---------------------------------------------------------------------------
// POST /connect — confirmConnect integration
// ---------------------------------------------------------------------------

describe('POST /connect — confirmConnect', () => {
	it('calls confirmConnect with (url, session) and rejects with 403 when it returns false', async () => {
		const confirmConnect = jest.fn().mockResolvedValue(false);
		const { port, close } = await startTestDaemon({}, { confirmConnect });
		try {
			const res = await post(port, '/connect', {
				url: 'http://localhost:5678',
				token: 'tok',
			});
			expect(res.status).toBe(403);
			const [calledUrl, calledSession] = confirmConnect.mock.calls[0] as [string, { dir: string }];
			expect(calledUrl).toBe('http://localhost:5678');
			expect(typeof calledSession.dir).toBe('string');
		} finally {
			await close();
		}
	});

	it('skips confirmConnect for URLs in allowedOrigins', async () => {
		const confirmConnect = jest.fn().mockResolvedValue(true);
		const { port, close } = await startTestDaemon(
			{ allowedOrigins: ['http://localhost:5678'], filesystem: { dir: tmpDir } },
			{ confirmConnect },
		);
		try {
			await post(port, '/connect', { url: 'http://localhost:5678', token: 'tok' });
			expect(confirmConnect).not.toHaveBeenCalled();
		} finally {
			await close();
		}
	});

	it('returns 400 when the session dir is invalid after confirmation', async () => {
		const { port, close } = await startTestDaemon(
			{ filesystem: { dir: '/nonexistent-dir-xyz' } },
			{ confirmConnect: jest.fn().mockResolvedValue(true) },
		);
		try {
			const res = await post(port, '/connect', {
				url: 'http://localhost:5678',
				token: 'tok',
			});
			expect(res.status).toBe(400);
			expect(res.body.error).toMatch(/Invalid directory/);
		} finally {
			await close();
		}
	});
});

// ---------------------------------------------------------------------------
// POST /connect — already connected
// ---------------------------------------------------------------------------

describe('POST /connect — already connected', () => {
	it('returns 409 if a client is already connected', async () => {
		const { port, close } = await startTestDaemon(
			{ filesystem: { dir: tmpDir } },
			{ confirmConnect: jest.fn().mockResolvedValue(true) },
		);
		try {
			// First connection
			await post(port, '/connect', { url: 'http://localhost:5678', token: 'tok' });
			// Second connection attempt
			const res = await post(port, '/connect', { url: 'http://localhost:5678', token: 'tok' });
			expect(res.status).toBe(409);
		} finally {
			await close();
		}
	});
});

// ---------------------------------------------------------------------------
// POST /disconnect
// ---------------------------------------------------------------------------

describe('POST /disconnect', () => {
	it('returns 200 when not connected', async () => {
		const { port, close } = await startTestDaemon();
		try {
			const res = await post(port, '/disconnect');
			expect(res.status).toBe(200);
			expect(res.body.status).toBe('disconnected');
		} finally {
			await close();
		}
	});

	it('disconnects an active client and resets state', async () => {
		const { port, close } = await startTestDaemon(
			{ filesystem: { dir: tmpDir } },
			{ confirmConnect: jest.fn().mockResolvedValue(true) },
		);
		try {
			await post(port, '/connect', { url: 'http://localhost:5678', token: 'tok' });
			const healthBefore = await get(port, '/health');
			expect(healthBefore.body.connected).toBe(true);

			await post(port, '/disconnect');
			const healthAfter = await get(port, '/health');
			expect(healthAfter.body.connected).toBe(false);
		} finally {
			await close();
		}
	});
});

// ---------------------------------------------------------------------------
// GET /status
// ---------------------------------------------------------------------------

describe('GET /status', () => {
	it('returns connected: false before any connection', async () => {
		const { port, close } = await startTestDaemon();
		try {
			const res = await get(port, '/status');
			expect(res.status).toBe(200);
			expect(res.body.connected).toBe(false);
			expect(res.body.connectedAt).toBeNull();
		} finally {
			await close();
		}
	});
});

// ---------------------------------------------------------------------------
// CORS preflight
// ---------------------------------------------------------------------------

describe('OPTIONS preflight', () => {
	it('returns 204 with CORS headers', async () => {
		const { port, close } = await startTestDaemon();
		try {
			const { status, headers } = await new Promise<{
				status: number;
				headers: Record<string, string | string[] | undefined>;
			}>((resolve, reject) => {
				const req = http.request(
					{ hostname: '127.0.0.1', port, path: '/connect', method: 'OPTIONS' },
					(r) => {
						r.resume();
						resolve({
							status: r.statusCode ?? 0,
							headers: r.headers as Record<string, string | string[] | undefined>,
						});
					},
				);
				req.on('error', reject);
				req.end();
			});
			expect(status).toBe(204);
			expect(headers['access-control-allow-origin']).toBe('*');
		} finally {
			await close();
		}
	});
});
