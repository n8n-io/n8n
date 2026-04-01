import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import type { DbConnection } from '@n8n/db';
import type express from 'express';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import { AssertionError } from 'node:assert';
import * as http from 'node:http';

import type { ExternalHooks } from '@/external-hooks';
import type { PrometheusMetricsService } from '@/metrics/prometheus-metrics.service';
import { bodyParser, rawBodyReader } from '@/middlewares';
import type { RedisClientService } from '@/services/redis-client.service';

import { WorkerServer } from '../worker-server';
import type { CredentialsOverwrites } from '@/credentials-overwrites';
import type { NextFunction, Request, Response } from 'express';

const app = mock<express.Application>();

jest.mock('node:http');
jest.mock('express', () => ({ __esModule: true, default: () => app }));

const addressInUseError = () => {
	const error: NodeJS.ErrnoException = new Error('Port already in use');
	error.code = 'EADDRINUSE';

	return error;
};

describe('WorkerServer', () => {
	let globalConfig: GlobalConfig;

	const externalHooks = mock<ExternalHooks>();
	const instanceSettings = mock<InstanceSettings>({ instanceType: 'worker' });
	const prometheusMetricsService = mock<PrometheusMetricsService>();
	const dbConnection = mock<DbConnection>();
	const credentialsOverwriteService = mock<CredentialsOverwrites>();
	const redisClientService = mock<RedisClientService>();

	const newWorkerServer = () =>
		new WorkerServer(
			globalConfig,
			mockLogger(),
			dbConnection,
			credentialsOverwriteService,
			externalHooks,
			instanceSettings,
			prometheusMetricsService,
			redisClientService,
		);

	beforeEach(() => {
		globalConfig = mock<GlobalConfig>({
			path: '/',
			queue: {
				health: { active: true, port: 5678, address: '::' },
			},
			credentials: {
				overwrite: { endpoint: '' },
			},
			endpoints: {
				health: '/internal/health',
			},
		});
		jest.restoreAllMocks();
	});

	describe('constructor', () => {
		it('should throw if non-worker instance type', () => {
			expect(
				() =>
					new WorkerServer(
						globalConfig,
						mockLogger(),
						dbConnection,
						mock(),
						externalHooks,
						mock<InstanceSettings>({ instanceType: 'webhook' }),
						prometheusMetricsService,
						mock(),
					),
			).toThrowError(AssertionError);
		});

		it('should exit if port taken', async () => {
			const server = mock<http.Server>();
			const processExitSpy = jest
				.spyOn(process, 'exit')
				.mockImplementation(() => undefined as never);

			jest.spyOn(http, 'createServer').mockReturnValue(server);

			server.on.mockImplementation((event: string, callback: (arg?: unknown) => void) => {
				if (event === 'error') callback(addressInUseError());
				return server;
			});

			newWorkerServer();

			expect(processExitSpy).toHaveBeenCalledWith(1);

			processExitSpy.mockRestore();
		});
	});

	describe('init', () => {
		it('should mount all endpoints when all are enabled', async () => {
			const server = mock<http.Server>();
			jest.spyOn(http, 'createServer').mockReturnValue(server);

			server.listen.mockImplementation((...args: unknown[]) => {
				const callback = args.find((arg) => typeof arg === 'function');
				if (callback) callback();
				return server;
			});

			const workerServer = newWorkerServer();

			const CREDENTIALS_OVERWRITE_ENDPOINT = 'credentials/overwrites';
			globalConfig.credentials.overwrite.endpoint = CREDENTIALS_OVERWRITE_ENDPOINT;

			await workerServer.init({ health: true, overwrites: true, metrics: true });

			expect(app.get).toHaveBeenCalledWith('/internal/health', expect.any(Function));
			expect(app.post).toHaveBeenCalledWith(
				`/${CREDENTIALS_OVERWRITE_ENDPOINT}`,
				rawBodyReader,
				bodyParser,
				expect.any(Function),
			);
			expect(prometheusMetricsService.init).toHaveBeenCalledWith(app);
		});

		it('should mount credential overwrite middleware if configured', async () => {
			const server = mock<http.Server>();
			jest.spyOn(http, 'createServer').mockReturnValue(server);

			server.listen.mockImplementation((...args: unknown[]) => {
				const callback = args.find((arg) => typeof arg === 'function');
				if (callback) callback();
				return server;
			});

			const workerServer = newWorkerServer();

			const CREDENTIALS_OVERWRITE_ENDPOINT = 'credentials/overwrites';
			globalConfig.credentials.overwrite.endpoint = CREDENTIALS_OVERWRITE_ENDPOINT;
			globalConfig.credentials.overwrite.endpointAuthToken = 'test-token';

			const middleware = (_req: Request, _res: Response, next: NextFunction) => next();
			credentialsOverwriteService.getOverwriteEndpointMiddleware.mockReturnValue(middleware);

			await workerServer.init({ health: true, overwrites: true, metrics: true });

			expect(app.use).toHaveBeenCalledWith(`/${CREDENTIALS_OVERWRITE_ENDPOINT}`, middleware);
			expect(app.post).toHaveBeenCalledWith(
				`/${CREDENTIALS_OVERWRITE_ENDPOINT}`,
				rawBodyReader,
				bodyParser,
				expect.any(Function),
			);
		});

		it('should mount only health and overwrites endpoints if only those are enabled', async () => {
			const server = mock<http.Server>();
			jest.spyOn(http, 'createServer').mockReturnValue(server);

			server.listen.mockImplementation((...args: unknown[]) => {
				const callback = args.find((arg) => typeof arg === 'function');
				if (callback) callback();
				return server;
			});

			const workerServer = newWorkerServer();

			await workerServer.init({ health: true, overwrites: false, metrics: true });

			expect(app.get).toHaveBeenCalledWith('/internal/health', expect.any(Function));
			expect(app.post).not.toHaveBeenCalled();
			expect(prometheusMetricsService.init).toHaveBeenCalledWith(app);
		});

		it('should throw if no endpoints are enabled', async () => {
			const server = mock<http.Server>();
			jest.spyOn(http, 'createServer').mockReturnValue(server);

			const workerServer = newWorkerServer();
			await expect(
				workerServer.init({ health: false, overwrites: false, metrics: false }),
			).rejects.toThrowError(AssertionError);
		});

		it('should call `worker.ready` external hook', async () => {
			const server = mock<http.Server>();
			jest.spyOn(http, 'createServer').mockReturnValue(server);

			const workerServer = newWorkerServer();

			server.listen.mockImplementation((...args: unknown[]) => {
				const callback = args.find((arg) => typeof arg === 'function');
				if (callback) callback();
				return server;
			});

			await workerServer.init({ health: true, overwrites: true, metrics: true });

			expect(externalHooks.run).toHaveBeenCalledWith('worker.ready');
		});
	});

	describe('readiness', () => {
		let readinessHandler: (req: express.Request, res: express.Response) => Promise<void>;

		async function initWithReadiness({ markReady = true } = {}) {
			const server = mock<http.Server>();
			jest.spyOn(http, 'createServer').mockReturnValue(server);

			server.listen.mockImplementation((...args: unknown[]) => {
				const callback = args.find((arg) => typeof arg === 'function');
				if (callback) callback();
				return server;
			});

			app.get.mockImplementation((...args: unknown[]) => {
				const [path, handler] = args as [string, (...a: unknown[]) => Promise<void>];
				if (path === '/internal/health/readiness') {
					readinessHandler = handler as (
						req: express.Request,
						res: express.Response,
					) => Promise<void>;
				}
				return app;
			});

			(
				dbConnection as { connectionState: { connected: boolean; migrated: boolean } }
			).connectionState = {
				connected: true,
				migrated: true,
			};
			redisClientService.isConnected.mockReturnValue(true);

			const workerServer = newWorkerServer();
			await workerServer.init({ health: true, overwrites: false, metrics: false });
			if (markReady) workerServer.markAsReady();
		}

		it('should return 200 after markAsReady() when DB and Redis are connected', async () => {
			await initWithReadiness();
			const res = mock<express.Response>();
			res.status.mockReturnValue(res);

			await readinessHandler(mock<express.Request>(), res);

			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.send).toHaveBeenCalledWith({ status: 'ok' });
		});

		it('should return 503 before markAsReady() even if DB and Redis are connected', async () => {
			await initWithReadiness({ markReady: false });
			const res = mock<express.Response>();
			res.status.mockReturnValue(res);

			await readinessHandler(mock<express.Request>(), res);

			expect(res.status).toHaveBeenCalledWith(503);
			expect(res.send).toHaveBeenCalledWith({ status: 'error' });
		});

		it('should return 503 if Redis disconnects after ready', async () => {
			await initWithReadiness();
			redisClientService.isConnected.mockReturnValue(false);
			const res = mock<express.Response>();
			res.status.mockReturnValue(res);

			await readinessHandler(mock<express.Request>(), res);

			expect(res.status).toHaveBeenCalledWith(503);
			expect(res.send).toHaveBeenCalledWith({ status: 'error' });
		});

		it('should return 503 if DB disconnects after ready', async () => {
			await initWithReadiness();
			(
				dbConnection as { connectionState: { connected: boolean; migrated: boolean } }
			).connectionState = { connected: false, migrated: true };
			const res = mock<express.Response>();
			res.status.mockReturnValue(res);

			await readinessHandler(mock<express.Request>(), res);

			expect(res.status).toHaveBeenCalledWith(503);
			expect(res.send).toHaveBeenCalledWith({ status: 'error' });
		});
	});
});
