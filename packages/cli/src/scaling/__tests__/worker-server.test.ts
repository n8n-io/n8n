import type { GlobalConfig } from '@n8n/config';
import type express from 'express';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import { AssertionError } from 'node:assert';
import * as http from 'node:http';

import type { ExternalHooks } from '@/external-hooks';
import type { PrometheusMetricsService } from '@/metrics/prometheus-metrics.service';
import { bodyParser, rawBodyReader } from '@/middlewares';
import { mockLogger } from '@test/mocking';

import { WorkerServer } from '../worker-server';

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

	beforeEach(() => {
		globalConfig = mock<GlobalConfig>({
			queue: {
				health: { active: true, port: 5678, address: '0.0.0.0' },
			},
			credentials: {
				overwrite: { endpoint: '' },
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
			const procesExitSpy = jest
				.spyOn(process, 'exit')
				.mockImplementation(() => undefined as never);

			jest.spyOn(http, 'createServer').mockReturnValue(server);

			server.on.mockImplementation((event: string, callback: (arg?: unknown) => void) => {
				if (event === 'error') callback(addressInUseError());
				return server;
			});

			new WorkerServer(
				globalConfig,
				mockLogger(),
				mock(),
				externalHooks,
				instanceSettings,
				prometheusMetricsService,
				mock(),
			);

			expect(procesExitSpy).toHaveBeenCalledWith(1);

			procesExitSpy.mockRestore();
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

			const workerServer = new WorkerServer(
				globalConfig,
				mockLogger(),
				mock(),
				externalHooks,
				instanceSettings,
				prometheusMetricsService,
				mock(),
			);

			const CREDENTIALS_OVERWRITE_ENDPOINT = 'credentials/overwrites';
			globalConfig.credentials.overwrite.endpoint = CREDENTIALS_OVERWRITE_ENDPOINT;

			await workerServer.init({ health: true, overwrites: true, metrics: true });

			expect(app.get).toHaveBeenCalledWith('/healthz', expect.any(Function));
			expect(app.post).toHaveBeenCalledWith(
				`/${CREDENTIALS_OVERWRITE_ENDPOINT}`,
				rawBodyReader,
				bodyParser,
				expect.any(Function),
			);
			expect(prometheusMetricsService.init).toHaveBeenCalledWith(app);
		});

		it('should mount only health and overwrites endpoints if only those are enabled', async () => {
			const server = mock<http.Server>();
			jest.spyOn(http, 'createServer').mockReturnValue(server);

			server.listen.mockImplementation((...args: unknown[]) => {
				const callback = args.find((arg) => typeof arg === 'function');
				if (callback) callback();
				return server;
			});

			const workerServer = new WorkerServer(
				globalConfig,
				mockLogger(),
				mock(),
				externalHooks,
				instanceSettings,
				prometheusMetricsService,
				mock(),
			);

			await workerServer.init({ health: true, overwrites: false, metrics: true });

			expect(app.get).toHaveBeenCalledWith('/healthz', expect.any(Function));
			expect(app.post).not.toHaveBeenCalled();
			expect(prometheusMetricsService.init).toHaveBeenCalledWith(app);
		});

		it('should throw if no endpoints are enabled', async () => {
			const server = mock<http.Server>();
			jest.spyOn(http, 'createServer').mockReturnValue(server);

			const workerServer = new WorkerServer(
				globalConfig,
				mockLogger(),
				mock(),
				externalHooks,
				instanceSettings,
				prometheusMetricsService,
				mock(),
			);
			await expect(
				workerServer.init({ health: false, overwrites: false, metrics: false }),
			).rejects.toThrowError(AssertionError);
		});

		it('should call `worker.ready` external hook', async () => {
			const server = mock<http.Server>();
			jest.spyOn(http, 'createServer').mockReturnValue(server);

			const workerServer = new WorkerServer(
				globalConfig,
				mockLogger(),
				mock(),
				externalHooks,
				instanceSettings,
				prometheusMetricsService,
				mock(),
			);

			server.listen.mockImplementation((...args: unknown[]) => {
				const callback = args.find((arg) => typeof arg === 'function');
				if (callback) callback();
				return server;
			});

			await workerServer.init({ health: true, overwrites: true, metrics: true });

			expect(externalHooks.run).toHaveBeenCalledWith('worker.ready');
		});
	});
});
