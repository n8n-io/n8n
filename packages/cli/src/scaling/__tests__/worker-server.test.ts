import type { GlobalConfig } from '@n8n/config';
import type express from 'express';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import { AssertionError } from 'node:assert';
import * as http from 'node:http';

import { PortTakenError } from '@/errors/port-taken.error';
import type { ExternalHooks } from '@/external-hooks';
import type { PrometheusMetricsService } from '@/metrics/prometheus-metrics.service';
import { bodyParser, rawBodyReader } from '@/middlewares';

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
				health: { active: true, port: 5678 },
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
						mock(),
						mock(),
						mock(),
						externalHooks,
						mock<InstanceSettings>({ instanceType: 'webhook' }),
						prometheusMetricsService,
					),
			).toThrowError(AssertionError);
		});

		it('should throw if port taken', async () => {
			const server = mock<http.Server>();

			jest.spyOn(http, 'createServer').mockReturnValue(server);

			server.on.mockImplementation((event: string, callback: (arg?: unknown) => void) => {
				if (event === 'error') callback(addressInUseError());
				return server;
			});

			expect(
				() =>
					new WorkerServer(
						globalConfig,
						mock(),
						mock(),
						mock(),
						externalHooks,
						instanceSettings,
						prometheusMetricsService,
					),
			).toThrowError(PortTakenError);
		});
	});

	describe('init', () => {
		it('should mount all endpoints when all are enabled', async () => {
			const server = mock<http.Server>();
			jest.spyOn(http, 'createServer').mockReturnValue(server);

			server.listen.mockImplementation((_port, callback: () => void) => {
				callback();
				return server;
			});

			const workerServer = new WorkerServer(
				globalConfig,
				mock(),
				mock(),
				mock(),
				externalHooks,
				instanceSettings,
				prometheusMetricsService,
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

			server.listen.mockImplementation((_port, callback: () => void) => {
				callback();
				return server;
			});

			const workerServer = new WorkerServer(
				globalConfig,
				mock(),
				mock(),
				mock(),
				externalHooks,
				instanceSettings,
				prometheusMetricsService,
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
				mock(),
				mock(),
				mock(),
				externalHooks,
				instanceSettings,
				prometheusMetricsService,
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
				mock(),
				mock(),
				mock(),
				externalHooks,
				instanceSettings,
				prometheusMetricsService,
			);

			server.listen.mockImplementation((_port, callback: () => void) => {
				callback();
				return server;
			});

			await workerServer.init({ health: true, overwrites: true, metrics: true });

			expect(externalHooks.run).toHaveBeenCalledWith('worker.ready');
		});
	});
});
