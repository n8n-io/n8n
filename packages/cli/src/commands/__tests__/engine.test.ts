import { mockInstance } from '@n8n/backend-test-utils';
import { EngineConfig } from '@n8n/config';
import { DbConnection } from '@n8n/db';
import { ErrorReporter } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import * as CrashJournal from '@/crash-journal';
import { EncryptionBootstrapService } from '@/encryption/encryption-bootstrap.service';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { ActivityEventRelay } from '@/events/relays/activity.event-relay';
import { TelemetryEventRelay } from '@/events/relays/telemetry.event-relay';
import { WorkflowFailureNotificationEventRelay } from '@/events/relays/workflow-failure-notification.event-relay';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { EngineV2Runtime } from '@/modules/engine-v2/engine-v2.runtime';
import { RedisExecutionResponseSender } from '@/modules/engine-v2/response-channel/redis-execution-response-sender';
import type { RedisResponsePublisher } from '@/modules/engine-v2/response-channel/redis-execution-response-sender';
import { NodeTypes } from '@/node-types';
import { OtelService } from '@/modules/otel/otel.service';
import { OtelConfig } from '@/modules/otel/otel.config';
import { OtelSettingsService } from '@/modules/otel/otel-settings.service';
import { PostHogClient } from '@/posthog';
import { RedisClientService } from '@n8n/backend-services';
import { ShutdownService } from '@/shutdown/shutdown.service';
import { TaskRunnerModule } from '@/task-runners/task-runner-module';

import { Engine } from '../engine';

vi.mock('@/crash-journal');

const dbConnection = mockInstance(DbConnection);
const encryptionBootstrap = mockInstance(EncryptionBootstrapService);
const loadNodesAndCredentials = mockInstance(LoadNodesAndCredentials);
loadNodesAndCredentials.init.mockResolvedValue(undefined);
loadNodesAndCredentials.postProcessLoaders.mockResolvedValue(undefined);
const runtime = mockInstance(EngineV2Runtime);
const taskRunnerModule = mockInstance(TaskRunnerModule);
const publisher = mock<RedisResponsePublisher>();
const redisClientService = mockInstance(RedisClientService, {
	toValidPrefix: (prefix: string) => prefix,
	createClient: vi.fn(() => publisher) as unknown as RedisClientService['createClient'],
});

// Services the base `init()` reaches, as in worker.test.ts.
const errorReporter = mockInstance(ErrorReporter);
mockInstance(NodeTypes);
const shutdownService = mockInstance(ShutdownService);
mockInstance(MessageEventBus);
mockInstance(PostHogClient);
const otelService = mockInstance(OtelService);
const otelSettingsService = mockInstance(OtelSettingsService);
mockInstance(TelemetryEventRelay);
mockInstance(ActivityEventRelay);
mockInstance(WorkflowFailureNotificationEventRelay);

describe('Engine', () => {
	const originalEnv = process.env;
	const originalSigtermListeners = new Set(process.listeners('SIGTERM'));
	const originalSigintListeners = new Set(process.listeners('SIGINT'));
	let engineConfig: EngineConfig;
	let otelConfig: OtelConfig;

	beforeEach(() => {
		vi.clearAllMocks();
		// The package test script sets `DB_TYPE`, which the command refuses. Start
		// from an env with no control plane database and no encryption key.
		process.env = Object.fromEntries(
			Object.entries(originalEnv).filter(
				([key]) =>
					!key.startsWith('DB_') &&
					key !== 'N8N_ENCRYPTION_KEY' &&
					key !== 'N8N_ENCRYPTION_KEY_FILE',
			),
		);
		engineConfig = mockInstance(EngineConfig, {
			tracingEnabled: false,
			authSecret: 'a'.repeat(32),
			controlPlaneBaseUrl: 'http://n8n-main:3001',
		});
		otelConfig = mockInstance(OtelConfig, { enabled: false });
	});

	afterEach(() => {
		process.env = originalEnv;
		for (const listener of process.listeners('SIGTERM')) {
			if (!originalSigtermListeners.has(listener)) process.removeListener('SIGTERM', listener);
		}
		for (const listener of process.listeners('SIGINT')) {
			if (!originalSigintListeners.has(listener)) process.removeListener('SIGINT', listener);
		}
	});

	const createEngine = () => {
		const engine = new Engine();
		// @ts-expect-error - Overriding readonly property for testing
		engine.globalConfig = {
			executions: { mode: 'regular' },
			multiMainSetup: { enabled: false },
			endpoints: {
				metrics: { enable: false },
				health: '/health',
				webhook: 'webhook',
				rest: 'rest',
			},
			database: { type: 'sqlite' },
			sentry: { backendDsn: '' },
			cache: { backend: 'memory' },
			taskRunners: {},
			outboundProxy: { mode: 'main-only' },
			expressionEngine: { engine: 'legacy', poolSize: 1, maxCodeCacheSize: 1024 },
			generic: { gracefulShutdownTimeout: 30 },
		};
		return engine;
	};

	describe('init', () => {
		it('starts environment-only tracing before Redis and the runtime', async () => {
			engineConfig.tracingEnabled = true;
			otelConfig.enabled = true;

			await createEngine().init();

			expect(otelService.initFromConfig).toHaveBeenCalledExactlyOnceWith(otelConfig);
			expect(otelService.init).not.toHaveBeenCalled();
			expect(otelSettingsService.loadSettings).not.toHaveBeenCalled();
			expect(dbConnection.init).not.toHaveBeenCalled();
			expect(dbConnection.migrate).not.toHaveBeenCalled();
			expect(otelService.initFromConfig.mock.invocationCallOrder[0]).toBeLessThan(
				redisClientService.createClient.mock.invocationCallOrder[0],
			);
			expect(otelService.initFromConfig.mock.invocationCallOrder[0]).toBeLessThan(
				runtime.init.mock.invocationCallOrder[0],
			);
		});

		it.each([
			[false, false],
			[false, true],
			[true, false],
		])('does not start tracing with engine=%s and otel=%s', async (engineEnabled, otelEnabled) => {
			engineConfig.tracingEnabled = engineEnabled;
			otelConfig.enabled = otelEnabled;
			await createEngine().init();
			expect(otelService.initFromConfig).not.toHaveBeenCalled();
		});

		it('refuses to boot with control plane database access', async () => {
			process.env.DB_POSTGRESDB_HOST = 'postgres';

			await expect(createEngine().init()).rejects.toThrow('DB_POSTGRESDB_HOST');
			expect(loadNodesAndCredentials.init).not.toHaveBeenCalled();
		});

		it('refuses to boot with the control plane encryption key', async () => {
			process.env.N8N_ENCRYPTION_KEY = 'secret';

			await expect(createEngine().init()).rejects.toThrow('N8N_ENCRYPTION_KEY');
			expect(loadNodesAndCredentials.init).not.toHaveBeenCalled();
		});

		it('refuses to boot with a control plane encryption key file', async () => {
			process.env.N8N_ENCRYPTION_KEY_FILE = '/tmp/key';

			await expect(createEngine().init()).rejects.toThrow('N8N_ENCRYPTION_KEY_FILE');
			expect(loadNodesAndCredentials.init).not.toHaveBeenCalled();
		});

		it('reports a refusal through the crash path, which the base init has not wired yet', async () => {
			process.env.DB_POSTGRESDB_HOST = 'postgres';
			const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
			vi.useFakeTimers();
			try {
				const engine = createEngine();
				const error = await engine.init().catch((e: unknown) => e);

				const caught = engine.catch(error as Error);
				await vi.runAllTimersAsync();
				await caught;

				expect(errorReporter.error).toHaveBeenCalledWith(expect.any(Error), { level: 'fatal' });
				expect(exit).toHaveBeenCalledWith(1);
			} finally {
				vi.useRealTimers();
				exit.mockRestore();
			}
		});

		it('refuses to boot without the shared secret', async () => {
			engineConfig.authSecret = '';

			await expect(createEngine().init()).rejects.toThrow('N8N_ENGINE_AUTH_SECRET');
		});

		it('refuses to boot without the control plane address', async () => {
			engineConfig.controlPlaneBaseUrl = '';

			await expect(createEngine().init()).rejects.toThrow('N8N_ENGINE_CONTROL_PLANE_BASE_URL');
		});

		it('never opens, migrates or reads the control plane database', async () => {
			await createEngine().init();

			expect(dbConnection.init).not.toHaveBeenCalled();
			expect(dbConnection.migrate).not.toHaveBeenCalled();
			expect(encryptionBootstrap.run).not.toHaveBeenCalled();
		});

		it('starts no crash journal', async () => {
			await createEngine().init();

			expect(CrashJournal.init).not.toHaveBeenCalled();
		});

		it('loads the nodes and starts no task runner', async () => {
			await createEngine().init();

			expect(loadNodesAndCredentials.init).toHaveBeenCalled();
			expect(taskRunnerModule.start).not.toHaveBeenCalled();
		});

		it('sends execution responses over Redis', async () => {
			await createEngine().init();

			expect(redisClientService.createClient).toHaveBeenCalledWith({ type: 'publisher(n8n)' });
			expect(runtime.init).toHaveBeenCalledWith(expect.any(RedisExecutionResponseSender));
		});

		it('starts the data plane after the base init and finishes loading the nodes', async () => {
			await createEngine().init();

			expect(runtime.init).toHaveBeenCalled();
			expect(vi.mocked(runtime.init).mock.invocationCallOrder[0]).toBeGreaterThan(
				vi.mocked(loadNodesAndCredentials.init).mock.invocationCallOrder[0],
			);
			expect(loadNodesAndCredentials.postProcessLoaders).toHaveBeenCalled();
		});
	});

	describe('stopProcess', () => {
		it('stops owned DP services without constructing CP shutdown services', async () => {
			const engine = createEngine();
			await engine.init();
			const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
			try {
				// @ts-expect-error - Accessing the protected signal handler for testing
				const terminate = engine.onTerminationSignal('SIGTERM');
				await terminate();
				await terminate();
				expect(shutdownService.shutdown).not.toHaveBeenCalled();
				expect(shutdownService.waitForShutdown).not.toHaveBeenCalled();
				expect(runtime.shutdown).toHaveBeenCalledOnce();
				expect(publisher.disconnect).toHaveBeenCalledOnce();
				expect(exit).toHaveBeenCalledOnce();
			} finally {
				exit.mockRestore();
			}
		});
		it('flushes tracing after the runtime and Redis stop, before exit', async () => {
			engineConfig.tracingEnabled = true;
			otelConfig.enabled = true;
			const engine = createEngine();
			await engine.init();
			const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
			try {
				// @ts-expect-error - Accessing protected method for testing
				await engine.stopProcess();
				expect(otelService.shutdown).toHaveBeenCalledTimes(1);
				expect(publisher.disconnect.mock.invocationCallOrder[0]).toBeLessThan(
					otelService.shutdown.mock.invocationCallOrder[0],
				);
				expect(otelService.shutdown.mock.invocationCallOrder[0]).toBeLessThan(
					exit.mock.invocationCallOrder[0],
				);
			} finally {
				exit.mockRestore();
			}
		});

		it('shuts the data plane down before exiting, without touching the crash journal', async () => {
			const engine = createEngine();
			await engine.init();
			const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
			try {
				// @ts-expect-error - Accessing protected method for testing
				await engine.stopProcess();

				expect(runtime.shutdown).toHaveBeenCalled();
				expect(publisher.disconnect).toHaveBeenCalledTimes(1);
				expect(vi.mocked(runtime.shutdown).mock.invocationCallOrder[0]).toBeLessThan(
					publisher.disconnect.mock.invocationCallOrder[0],
				);
				expect(exit).toHaveBeenCalledWith();
				expect(vi.mocked(runtime.shutdown).mock.invocationCallOrder[0]).toBeLessThan(
					exit.mock.invocationCallOrder[0],
				);
				expect(CrashJournal.cleanup).not.toHaveBeenCalled();
				expect(dbConnection.close).not.toHaveBeenCalled();
			} finally {
				exit.mockRestore();
			}
		});
	});
});
