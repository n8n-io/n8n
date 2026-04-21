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
	allowedOrigins: ['http://localhost:5678'],
	filesystem: { dir: '/' },
	computer: { shell: { timeout: 30_000 } },
	browser: { defaultBrowser: 'chrome' },
	permissions: {},
	permissionConfirmation: 'instance',
};

type JsonBody = Record<string, unknown>;

const DEFAULT_ORIGIN = 'http://localhost:5678';

async function post(
	port: number,
	urlPath: string,
	body: JsonBody = {},
	origin: string | null = DEFAULT_ORIGIN,
): Promise<{ status: number; body: JsonBody }> {
	return await new Promise((resolve, reject) => {
		const payload = JSON.stringify(body);
		const headers: Record<string, string | number> = {
			['Content-Type']: 'application/json',
			['Content-Length']: Buffer.byteLength(payload),
		};
		if (origin) headers['Origin'] = origin;
		const req = http.request(
			{ hostname: '127.0.0.1', port, path: urlPath, method: 'POST', headers },
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

async function get(
	port: number,
	urlPath: string,
	origin: string | null = DEFAULT_ORIGIN,
): Promise<{ status: number; body: JsonBody }> {
	return await new Promise((resolve, reject) => {
		const headers: Record<string, string> = {};
		if (origin) headers['Origin'] = origin;
		http
			.get({ hostname: '127.0.0.1', port, path: urlPath, headers }, (res) => {
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
							['Origin']: DEFAULT_ORIGIN,
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
// POST /connect — origin allowlist
// ---------------------------------------------------------------------------

describe('POST /connect — origin allowlist', () => {
	it('silently refuses (403) connections from non-matching origins without calling confirmConnect', async () => {
		const confirmConnect = jest.fn().mockResolvedValue(true);
		const { port, close } = await startTestDaemon(
			{ allowedOrigins: ['http://localhost:5678'] },
			{ confirmConnect },
		);
		try {
			const res = await post(port, '/connect', {
				url: 'http://attacker.example.com',
				token: 'tok',
			});
			expect(res.status).toBe(403);
			expect(confirmConnect).not.toHaveBeenCalled();
		} finally {
			await close();
		}
	});

	it('calls confirmConnect for connections from allowed origins', async () => {
		const confirmConnect = jest.fn().mockResolvedValue(false);
		const { port, close } = await startTestDaemon(
			{ allowedOrigins: ['http://localhost:5678'] },
			{ confirmConnect },
		);
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
// POST /connect — concurrent confirmation
// ---------------------------------------------------------------------------

describe('POST /connect — concurrent confirmation', () => {
	it('returns 409 when a confirmation prompt is already in progress', async () => {
		let resolveConfirm!: (value: boolean) => void;
		const confirmConnect = jest
			.fn()
			.mockImplementation(
				async () => await new Promise<boolean>((resolve) => (resolveConfirm = resolve)),
			);
		const { port, close } = await startTestDaemon(
			{ filesystem: { dir: tmpDir } },
			{ confirmConnect },
		);
		try {
			// First connection — hangs waiting for user confirmation
			const first = post(port, '/connect', { url: 'http://localhost:5678', token: 'tok' });

			// Wait for the first request to reach confirmConnect
			await new Promise((resolve) => setTimeout(resolve, 50));

			// Second connection attempt while confirmation is pending
			const second = await post(port, '/connect', { url: 'http://localhost:5679', token: 'tok' });
			expect(second.status).toBe(409);
			expect(second.body.error).toMatch(/confirmation is already in progress/);

			// Resolve the first confirmation and await its response
			resolveConfirm(false);
			await first;
		} finally {
			await close();
		}
	});

	it('accepts a new connection after a pending confirmation completes', async () => {
		let resolveConfirm!: (value: boolean) => void;
		const confirmConnect = jest
			.fn()
			.mockImplementationOnce(
				async () => await new Promise<boolean>((resolve) => (resolveConfirm = resolve)),
			)
			.mockResolvedValue(true);
		const { port, close } = await startTestDaemon(
			{ filesystem: { dir: tmpDir } },
			{ confirmConnect },
		);
		try {
			// First connection — hangs then gets rejected
			const first = post(port, '/connect', { url: 'http://localhost:5678', token: 'tok' });
			await new Promise((resolve) => setTimeout(resolve, 50));
			resolveConfirm(false);
			await first;

			// Second connection after confirmation cleared — should succeed
			const second = await post(port, '/connect', { url: 'http://localhost:5678', token: 'tok' });
			expect(second.status).toBe(200);
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

async function options(
	port: number,
	urlPath: string,
	origin?: string,
): Promise<{ status: number; headers: Record<string, string | string[] | undefined> }> {
	return await new Promise((resolve, reject) => {
		const headers: Record<string, string> = {};
		if (origin) headers['Origin'] = origin;
		const req = http.request(
			{ hostname: '127.0.0.1', port, path: urlPath, method: 'OPTIONS', headers },
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
}

describe('OPTIONS preflight', () => {
	it('returns 204 with echoed origin for matching origins', async () => {
		const { port, close } = await startTestDaemon();
		try {
			const { status, headers } = await options(port, '/connect', 'http://localhost:5678');
			expect(status).toBe(204);
			expect(headers['access-control-allow-origin']).toBe('http://localhost:5678');
		} finally {
			await close();
		}
	});

	it('returns 403 for non-matching origins', async () => {
		const { port, close } = await startTestDaemon();
		try {
			const { status, headers } = await options(port, '/connect', 'https://attacker.example.com');
			expect(status).toBe(403);
			expect(headers['access-control-allow-origin']).toBeUndefined();
		} finally {
			await close();
		}
	});

	it('returns 403 when no Origin header is sent', async () => {
		const { port, close } = await startTestDaemon();
		try {
			const { status } = await options(port, '/connect');
			expect(status).toBe(403);
		} finally {
			await close();
		}
	});
});

// ---------------------------------------------------------------------------
// Origin guard — non-preflight requests
// ---------------------------------------------------------------------------

describe('Origin guard on non-preflight requests', () => {
	it('returns 403 when Origin header is absent', async () => {
		const { port, close } = await startTestDaemon();
		try {
			const res = await get(port, '/health', null);
			expect(res.status).toBe(403);
		} finally {
			await close();
		}
	});

	it('returns 403 when Origin header is non-matching', async () => {
		const { port, close } = await startTestDaemon();
		try {
			const res = await get(port, '/health', 'https://attacker.example.com');
			expect(res.status).toBe(403);
		} finally {
			await close();
		}
	});

	it('processes requests normally when Origin matches the allowlist', async () => {
		const { port, close } = await startTestDaemon();
		try {
			const res = await get(port, '/health', DEFAULT_ORIGIN);
			expect(res.status).toBe(200);
		} finally {
			await close();
		}
	});
});

// ---------------------------------------------------------------------------
// isOriginAllowed — wildcard matching
// ---------------------------------------------------------------------------

describe('isOriginAllowed', () => {
	let isOriginAllowed: (origin: string, allowedOrigins: string[]) => boolean;

	beforeEach(async () => {
		({ isOriginAllowed } = await import('./daemon'));
	});

	const cloudPattern = 'https://*.app.n8n.cloud';

	it('matches a single-level subdomain', () => {
		expect(isOriginAllowed('https://my-instance.app.n8n.cloud', [cloudPattern])).toBe(true);
	});

	it('matches a multi-level subdomain', () => {
		expect(isOriginAllowed('https://a.b.app.n8n.cloud', [cloudPattern])).toBe(true);
	});

	it('does not match the base domain without subdomain', () => {
		expect(isOriginAllowed('https://app.n8n.cloud', [cloudPattern])).toBe(false);
	});

	it('does not match an unrelated origin', () => {
		expect(isOriginAllowed('https://attacker.com', [cloudPattern])).toBe(false);
	});

	it('does not match when scheme differs', () => {
		expect(isOriginAllowed('http://my-instance.app.n8n.cloud', [cloudPattern])).toBe(false);
	});

	it('does not match when port differs from pattern default', () => {
		expect(isOriginAllowed('https://my-instance.app.n8n.cloud:8080', [cloudPattern])).toBe(false);
	});

	it('matches exact origins without wildcards', () => {
		expect(isOriginAllowed('http://localhost:5678', ['http://localhost:5678'])).toBe(true);
	});

	it('rejects exact origins that differ by port', () => {
		expect(isOriginAllowed('http://localhost:3000', ['http://localhost:5678'])).toBe(false);
	});
});
