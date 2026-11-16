import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ErrorReporter } from 'n8n-core';

import { initErrorReporting } from '../error-reporting-boot';

describe('initErrorReporting', () => {
	const errorReporter = mockInstance(ErrorReporter);
	const logger = mockInstance(Logger);
	const globalConfig = mockInstance(GlobalConfig, {
		sentry: {
			backendDsn: 'https://key@sentry.example/1',
			environment: 'production',
			deploymentName: 'deployment',
			profilingEnabled: true,
			tracesSampleRate: 0.1,
			tracesSlowSpanThresholdMs: 500,
			webhookTracesSampleRate: 0.05,
			eventLoopBlockThreshold: 300,
			eventLoopBlockMaxEventsPerHour: 10,
			eventLoopBlockDetectionEnabled: true,
		},
		endpoints: { webhook: 'webhook', health: '/healthz' },
		database: { type: 'postgresdb' },
		executions: { mode: 'regular' },
		cache: { backend: 'redis' },
	} as unknown as GlobalConfig);

	const originalArgv = process.argv;

	beforeEach(() => {
		vi.clearAllMocks();
		process.argv = ['node', 'n8n', 'worker'];
	});

	afterAll(() => {
		process.argv = originalArgv;
	});

	it.each([
		{
			databaseType: 'postgresdb',
			executionsMode: 'regular',
			cacheBackend: 'redis',
			eligibleIntegrations: { Express: true, Http: true, Postgres: true, Redis: true },
		},
		{
			databaseType: 'sqlite',
			executionsMode: 'regular',
			cacheBackend: 'memory',
			eligibleIntegrations: { Express: true, Http: true, Postgres: false, Redis: false },
		},
		{
			databaseType: 'sqlite',
			executionsMode: 'queue',
			cacheBackend: 'memory',
			eligibleIntegrations: { Express: true, Http: true, Postgres: false, Redis: true },
		},
	] as const)(
		'starts Sentry with the Sentry config for $databaseType, $executionsMode mode and $cacheBackend cache',
		async ({ databaseType, executionsMode, cacheBackend, eligibleIntegrations }) => {
			globalConfig.database.type = databaseType;
			globalConfig.executions.mode = executionsMode;
			globalConfig.cache.backend = cacheBackend;

			await initErrorReporting();

			expect(errorReporter.init).toHaveBeenCalledWith(
				expect.objectContaining({
					serverType: 'worker',
					dsn: 'https://key@sentry.example/1',
					environment: 'production',
					serverName: 'deployment',
					release: expect.stringMatching(/^n8n@/),
					withEventLoopBlockDetection: true,
					eventLoopBlockThreshold: 300,
					eventLoopBlockMaxEventsPerHour: 10,
					tracesSampleRate: 0.1,
					slowSpanThresholdMs: 500,
					webhookEndpoint: 'webhook',
					webhookTracesSampleRate: 0.05,
					profilingEnabled: true,
					healthEndpoint: '/healthz',
					eligibleIntegrations,
				}),
			);
		},
	);

	it('logs the error and does not throw when Sentry fails to start', async () => {
		errorReporter.init.mockRejectedValueOnce(new Error('init failed'));

		await expect(initErrorReporting()).resolves.toBeUndefined();

		expect(logger.error).toHaveBeenCalledWith(
			'Failed to set up error reporting at startup, so n8n sends no errors to Sentry',
			{ error: 'init failed' },
		);
	});
});

describe('bin/n8n', () => {
	it('starts Sentry, then OpenTelemetry, then loads the command, and exits with 1 when the command fails', () => {
		const workDir = mkdtempSync(path.join(tmpdir(), 'n8n-bin-'));
		const preload = path.join(workDir, 'break-command-registry.cjs');
		writeFileSync(
			preload,
			`const Module = require('module');
const load = Module._load;
const tracked = ['error-reporting-boot', 'observability-boot', 'command-registry'];
const loaded = new Set();
Module._load = function (request, ...rest) {
	const name = tracked.find((module) => request.includes(module));
	if (name && !loaded.has(name)) {
		loaded.add(name);
		process.stderr.write('loaded ' + name + '\\n');
	}
	if (name === 'command-registry') throw new Error('command registry failed to load');
	return load.call(this, request, ...rest);
};`,
		);

		try {
			const result = spawnSync(
				process.execPath,
				['--require', preload, path.resolve(__dirname, '../../../bin/n8n'), 'start'],
				{
					cwd: workDir,
					env: {
						PATH: process.env.PATH,
						N8N_USER_FOLDER: workDir,
						N8N_SENTRY_DSN: 'http://public@127.0.0.1:9/1',
					},
					encoding: 'utf8',
					timeout: 30_000,
				},
			);

			const loadOrder = result.stderr
				.split('\n')
				.filter((line) => line.startsWith('loaded '))
				.map((line) => line.slice('loaded '.length));

			expect(loadOrder).toEqual(['error-reporting-boot', 'observability-boot', 'command-registry']);
			expect(result.stderr).toContain('command registry failed to load');
			expect(result.status).toBe(1);
		} finally {
			rmSync(workDir, { recursive: true, force: true });
		}
	});
});
