import { GlobalConfig } from '@n8n/config';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import type express from 'express';
import { mock } from 'jest-mock-extended';
import type * as http from 'node:http';

import { AbstractServer } from '@/abstract-server';
import { ExternalHooks } from '@/external-hooks';

const mockServer = mock<http.Server>();

jest.mock('http', () => ({
	...jest.requireActual('http'),
	createServer: () => mockServer,
}));

const mockApp = mock<express.Application>();
mockApp.get.mockReturnValue(mockApp);
mockApp.use.mockReturnValue(mockApp);

jest.mock('express', () => ({ __esModule: true, default: () => mockApp }));

class TestServer extends AbstractServer {
	async configure() {}
}

describe('AbstractServer health endpoints', () => {
	let testServer: TestServer;
	let healthHandler: (req: express.Request, res: express.Response) => void;
	let readinessHandler: (req: express.Request, res: express.Response) => void;
	let dbConnection: DbConnection;

	beforeEach(async () => {
		jest.restoreAllMocks();

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
