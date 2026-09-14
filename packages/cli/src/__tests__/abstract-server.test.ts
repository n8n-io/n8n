import { GlobalConfig } from '@n8n/config';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import type express from 'express';
import type * as http from 'node:http';
import { mock } from 'vitest-mock-extended';

import { AbstractServer } from '@/abstract-server';
import { ExternalHooks } from '@/external-hooks';
import { Logger } from '@n8n/backend-common';

const mockServer = mock<http.Server>();

vi.mock('http', async () => ({
	...(await vi.importActual<typeof import('http')>('http')),
	createServer: () => mockServer,
}));

const mockApp = mock<express.Application>();
mockApp.get.mockReturnValue(mockApp);
mockApp.use.mockReturnValue(mockApp);

vi.mock('express', async () => ({ __esModule: true, default: () => mockApp }));

class TestServer extends AbstractServer {
	async configure() {}
}

/** Skips webhook route registration so only middleware is set up. */
class BotFilterTestServer extends AbstractServer {
	protected override webhooksEnabled = false;
	async configure() {}
}

describe('AbstractServer health endpoints', () => {
	let testServer: TestServer;
	let healthHandler: (req: express.Request, res: express.Response) => void;
	let readinessHandler: (req: express.Request, res: express.Response) => void;
	let dbConnection: DbConnection;

	beforeEach(async () => {
		vi.restoreAllMocks();

		mockServer.listen.mockImplementation((...args: unknown[]) => {
			const callback = args.find((arg) => typeof arg === 'function');
			if (callback) callback();
			return mockServer;
		});

		dbConnection = mock<DbConnection>();
		(
			dbConnection as { connectionState: { connected: boolean; migrated: boolean } }
		).connectionState = { connected: true, migrated: true };
		Container.set(DbConnection, dbConnection);

		const globalConfig = mock<GlobalConfig>({
			path: '/',
			protocol: 'http',
			port: 5678,
			listen_address: '0.0.0.0',
			proxy_hops: 0,
			ssl_key: '',
			ssl_cert: '',
			endpoints: {
				rest: 'rest',
				form: 'form',
				formTest: 'form-test',
				formWaiting: 'form-waiting',
				webhook: 'webhook',
				webhookTest: 'webhook-test',
				webhookWaiting: 'webhook-waiting',
				mcp: 'mcp',
				mcpTest: 'mcp-test',
				health: '/healthz',
			},
		});
		Container.set(GlobalConfig, globalConfig);
		Container.set(ExternalHooks, mock<ExternalHooks>());

		mockApp.get.mockImplementation((...args: unknown[]) => {
			const [path, handler] = args as [
				string,
				(req: express.Request, res: express.Response) => void,
			];
			if (path === '/healthz') {
				healthHandler = handler;
			} else if (path === '/healthz/readiness') {
				readinessHandler = handler;
			}
			return mockApp;
		});

		testServer = new TestServer();
		await testServer.init();
	});

	describe('/healthz (liveness)', () => {
		it('should return 200 regardless of fullyReady flag', () => {
			const res = mock<express.Response>();
			healthHandler(mock<express.Request>(), res);
			expect(res.send).toHaveBeenCalledWith({ status: 'ok' });
		});
	});

	describe('/healthz/readiness', () => {
		it('should return 503 before markAsReady() is called', () => {
			const res = mock<express.Response>();
			res.status.mockReturnValue(res);

			readinessHandler(mock<express.Request>(), res);

			expect(res.status).toHaveBeenCalledWith(503);
			expect(res.send).toHaveBeenCalledWith({ status: 'error' });
		});

		it('should return 200 after markAsReady() is called', () => {
			testServer.markAsReady();

			const res = mock<express.Response>();
			res.status.mockReturnValue(res);

			readinessHandler(mock<express.Request>(), res);

			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.send).toHaveBeenCalledWith({ status: 'ok' });
		});

		it('should return 503 if DB disconnects after markAsReady()', () => {
			testServer.markAsReady();
			dbConnection.connectionState.connected = false;

			const res = mock<express.Response>();
			res.status.mockReturnValue(res);

			readinessHandler(mock<express.Request>(), res);

			expect(res.status).toHaveBeenCalledWith(503);
			expect(res.send).toHaveBeenCalledWith({ status: 'error' });
		});
	});
});

describe('AbstractServer bot filter middleware', () => {
	type Middleware = (req: express.Request, res: express.Response, next: () => void) => void;

	/** Finds the bot filter by probing captured app.use calls — no index dependency. */
	function findBotFilter(calls: typeof mockApp.use.mock.calls): Middleware {
		const probeUA = 'Googlebot/2.1';
		for (const [fn] of calls) {
			if (typeof fn !== 'function') continue;
			const middleware = fn as unknown as Middleware;
			const req = mock<express.Request>({ headers: { 'user-agent': probeUA }, path: '/rest/test' });
			const res = mock<express.Response>();
			res.status.mockReturnValue(res);
			const next = vi.fn();
			try {
				middleware(req, res, next);
			} catch {
				// Skip middlewares that throw with the probe request (e.g. rawBodyReader)
				continue;
			}
			if (res.status.mock.calls.some(([code]) => code === 204)) return middleware;
		}
		throw new Error('Bot filter middleware not found in app.use calls');
	}

	let botFilter: Middleware;

	beforeEach(async () => {
		vi.clearAllMocks();
		mockApp.use.mockReturnValue(mockApp);
		mockApp.all.mockReturnValue(mockApp);
		mockApp.get.mockReturnValue(mockApp);

		Container.set(
			GlobalConfig,
			mock<GlobalConfig>({
				path: '/',
				protocol: 'http',
				port: 5678,
				listen_address: '0.0.0.0',
				proxy_hops: 0,
				ssl_key: '',
				ssl_cert: '',
				endpoints: {
					rest: 'rest',
					form: 'form',
					formTest: 'form-test',
					formWaiting: 'form-waiting',
					webhook: 'webhook',
					webhookTest: 'webhook-test',
					webhookWaiting: 'webhook-waiting',
					mcp: 'mcp',
					mcpTest: 'mcp-test',
					health: '/healthz',
				},
			}),
		);
		Container.set(Logger, mock<Logger>());

		const server = new BotFilterTestServer();
		await server.start();

		botFilter = findBotFilter(mockApp.use.mock.calls);
	});

	const botUA = 'Googlebot/2.1 (+http://www.google.com/bot.html)';

	const callFilter = (path: string, userAgent: string) => {
		const req = mock<express.Request>({ headers: { 'user-agent': userAgent }, path });
		const res = mock<express.Response>();
		res.status.mockReturnValue(res);
		const next = vi.fn();
		botFilter(req, res, next);
		return { req, res, next };
	};

	it('allows bot UA through for /webhook/ paths', () => {
		const { res, next } = callFilter('/webhook/abc123', botUA);
		expect(next).toHaveBeenCalled();
		expect(res.status).not.toHaveBeenCalled();
	});

	it('allows bot UA through for /webhook-test/ paths', () => {
		const { res, next } = callFilter('/webhook-test/abc123', botUA);
		expect(next).toHaveBeenCalled();
		expect(res.status).not.toHaveBeenCalled();
	});

	it('allows bot UA through for /webhook-waiting/ paths', () => {
		const { res, next } = callFilter('/webhook-waiting/abc123', botUA);
		expect(next).toHaveBeenCalled();
		expect(res.status).not.toHaveBeenCalled();
	});

	it('allows bot UA through for /form/ paths', () => {
		const { res, next } = callFilter('/form/abc123', botUA);
		expect(next).toHaveBeenCalled();
		expect(res.status).not.toHaveBeenCalled();
	});

	it('allows bot UA through for /mcp/ paths', () => {
		const { res, next } = callFilter('/mcp/abc123', botUA);
		expect(next).toHaveBeenCalled();
		expect(res.status).not.toHaveBeenCalled();
	});

	it('blocks bot UA on non-webhook paths with 204', () => {
		const { res, next } = callFilter('/rest/workflows', botUA);
		expect(res.status).toHaveBeenCalledWith(204);
		expect(res.end).toHaveBeenCalled();
		expect(next).not.toHaveBeenCalled();
	});

	it('allows non-bot UA through any path', () => {
		const { res, next } = callFilter('/rest/workflows', 'Mozilla/5.0 (compatible; myapp/1.0)');
		expect(next).toHaveBeenCalled();
		expect(res.status).not.toHaveBeenCalled();
	});

	it('allows request with no User-Agent through any path', () => {
		const req = mock<express.Request>({ headers: {}, path: '/rest/workflows' });
		const res = mock<express.Response>();
		const next = vi.fn();
		botFilter(req, res, next);
		expect(next).toHaveBeenCalled();
	});
});
