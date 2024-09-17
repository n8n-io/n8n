import type { GlobalConfig } from '@n8n/config';
import type express from 'express';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import { AssertionError } from 'node:assert';
import * as http from 'node:http';

import { PortTakenError } from '@/errors/port-taken.error';
import type { ExternalHooks } from '@/external-hooks';
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
					new WorkerServer(globalConfig, mock(), mock(), mock(), externalHooks, instanceSettings),
			).toThrowError(PortTakenError);
		});

		it('should set up `/healthz` if health check is enabled', async () => {
			jest.spyOn(http, 'createServer').mockReturnValue(mock<http.Server>());

			new WorkerServer(globalConfig, mock(), mock(), mock(), externalHooks, instanceSettings);

			expect(app.get).toHaveBeenCalledWith('/healthz', expect.any(Function));
		});

		it('should not set up `/healthz` if health check is disabled', async () => {
			globalConfig.queue.health.active = false;

			jest.spyOn(http, 'createServer').mockReturnValue(mock<http.Server>());

			new WorkerServer(globalConfig, mock(), mock(), mock(), externalHooks, instanceSettings);

			expect(app.get).not.toHaveBeenCalled();
		});

		it('should set up `/:endpoint` if overwrites endpoint is set', async () => {
			jest.spyOn(http, 'createServer').mockReturnValue(mock<http.Server>());

			const CREDENTIALS_OVERWRITE_ENDPOINT = 'credentials/overwrites';
			globalConfig.credentials.overwrite.endpoint = CREDENTIALS_OVERWRITE_ENDPOINT;

			new WorkerServer(globalConfig, mock(), mock(), mock(), externalHooks, instanceSettings);

			expect(app.post).toHaveBeenCalledWith(
				`/${CREDENTIALS_OVERWRITE_ENDPOINT}`,
				rawBodyReader,
				bodyParser,
				expect.any(Function),
			);
		});

		it('should not set up `/:endpoint` if overwrites endpoint is not set', async () => {
			jest.spyOn(http, 'createServer').mockReturnValue(mock<http.Server>());

			new WorkerServer(globalConfig, mock(), mock(), mock(), externalHooks, instanceSettings);

			expect(app.post).not.toHaveBeenCalled();
		});
	});

	describe('init', () => {
		it('should call `worker.ready` external hook', async () => {
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
			);
			await workerServer.init();

			expect(externalHooks.run).toHaveBeenCalledWith('worker.ready');
		});
	});
});
