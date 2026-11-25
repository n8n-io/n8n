import type { Logger } from '@n8n/backend-common';
import type { OutboundHttp } from '@n8n/backend-network';
import { mockInstance } from '@n8n/backend-test-utils';
import { AzureBlobConfig, ObjectStoreConfig } from '@n8n/blob-storage';
import { ObjectStoreService } from '@n8n/blob-storage/object-store';
import { EngineConfig } from '@n8n/config';
import { DbConnection } from '@n8n/db';
import { CommandMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { WorkQueuePublisherClient } from '@n8n/engine';
import { BinaryDataConfig, BinaryDataService, ErrorReporter } from 'n8n-core';
import { Expression } from 'n8n-workflow';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

import * as CrashJournal from '@/crash-journal';
import { EncryptionBootstrapService } from '@/encryption/encryption-bootstrap.service';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { ActivityEventRelay } from '@/events/relays/activity.event-relay';
import { TelemetryEventRelay } from '@/events/relays/telemetry.event-relay';
import { WorkflowFailureNotificationEventRelay } from '@/events/relays/workflow-failure-notification.event-relay';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { EngineMtls } from '@/modules/engine-v2/engine-mtls';
import { parseEngineRoles } from '@/modules/engine-v2/engine-roles';
import { EngineV2Runtime } from '@/modules/engine-v2/engine-v2.runtime';
import { ExecutionChannelSender } from '@/modules/engine-v2/execution-channel/execution-channel-sender';
import { LifecycleEventChannelSender } from '@/modules/engine-v2/execution-channel/lifecycle-event-sender';
import type { RedisChannelPublisher } from '@/modules/engine-v2/execution-channel/redis-execution-channel-publisher';
import { createInstanceRedisWorkQueues } from '@/modules/engine-v2/work-queue/redis-work-queues';
import { NodeTypes } from '@/node-types';
import { OtelService } from '@/modules/otel/otel.service';
import { RedisClientService, PostHogClient } from '@n8n/backend-services';
import { ShutdownService } from '@/shutdown/shutdown.service';
import { TaskRunnerModule } from '@/task-runners/task-runner-module';

import { Engine } from '../engine';

vi.mock('@/crash-journal');
vi.mock('@/modules/engine-v2/work-queue/redis-work-queues', { spy: true });

const dbConnection = mockInstance(DbConnection);
const encryptionBootstrap = mockInstance(EncryptionBootstrapService);
const loadNodesAndCredentials = mockInstance(LoadNodesAndCredentials);
loadNodesAndCredentials.init.mockResolvedValue(undefined);
loadNodesAndCredentials.postProcessLoaders.mockResolvedValue(undefined);
const runtime = mockInstance(EngineV2Runtime);
const taskRunnerModule = mockInstance(TaskRunnerModule);
const binaryDataConfig = mockInstance(BinaryDataConfig, { mode: 'filesystem' });
const binaryDataService = mockInstance(BinaryDataService);
const objectStoreService = mockInstance(ObjectStoreService);
// Mocked so the tests do not depend on the storage env of the machine.
const objectStoreConfig = mockInstance(ObjectStoreConfig, { bucket: { name: '', region: '' } });
const azureBlobConfig = mockInstance(AzureBlobConfig, { containerName: '' });
const publisher = mock<RedisChannelPublisher & WorkQueuePublisherClient>();
/** Stands in for each consuming connection of the work queues. */
const workQueueConsumer = mock<{ disconnect(): void }>();
const redisClientService = mockInstance(RedisClientService, {
	toValidPrefix: (prefix: string) => prefix,
	createClient: vi.fn(({ type }: { type: string }) =>
		type === 'publisher(n8n)' ? publisher : workQueueConsumer,
	) as unknown as RedisClientService['createClient'],
});

// Services the base `init()` reaches, as in worker.test.ts.
const errorReporter = mockInstance(ErrorReporter);
mockInstance(NodeTypes);
mockInstance(ShutdownService);
mockInstance(MessageEventBus);
mockInstance(PostHogClient);
mockInstance(OtelService);
mockInstance(TelemetryEventRelay);
mockInstance(ActivityEventRelay);
mockInstance(WorkflowFailureNotificationEventRelay);

/** The real boot check, over files this test does not need to write. */
const useTls = (enabled: boolean) => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const mtls = new EngineMtls(Container.get(EngineConfig), mock<OutboundHttp>(), logger);
	vi.spyOn(mtls, 'enabled', 'get').mockReturnValue(enabled);
	Container.set(EngineMtls, mtls);
	return mtls;
};

describe('Engine', () => {
	const originalEnv = process.env;
	let engineConfig: EngineConfig;

	beforeEach(() => {
		vi.clearAllMocks();
		binaryDataConfig.mode = 'filesystem';
		objectStoreConfig.bucket.name = '';
		azureBlobConfig.containerName = '';
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
			authSecret: 'a'.repeat(32),
			controlPlaneBaseUrl: 'http://n8n-main:3001',
			tlsInsecureAllowPlainHttp: true,
			orchestrationConcurrency: 1,
			stepConcurrency: 1,
			roles: '',
		});
		useTls(false);
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	/** Opens the consuming connections, as the runtime does when it starts the queues. */
	const startAndStopWorkQueues = async () => {
		const queues = vi.mocked(runtime.init).mock.calls.at(-1)?.[0].queues;
		for (const queue of [queues?.orchestration, queues?.step]) {
			queue?.start(async () => {});
			await queue?.stop();
		}
	};

	const createEngine = (flags: { roles?: string } = {}) => {
		const engine = new Engine();
		// @ts-expect-error - Overriding readonly property for testing
		engine.flags = flags;
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
			codeExecution: { backend: 'task-runners' },
			outboundProxy: { mode: 'main-only' },
			expressionEngine: { engine: 'legacy', poolSize: 1, maxCodeCacheSize: 1024 },
			generic: { gracefulShutdownTimeout: 30 },
		};
		return engine;
	};

	describe('init', () => {
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

		it.each([
			{ flag: undefined, role: 'api' },
			{ flag: 'api', role: 'api' },
			{ flag: 'step-worker', role: 'step-worker' },
			{ flag: 'orchestrator,step-worker', role: 'step-worker' },
		])(
			'refuses to boot --roles=$flag without the shared secret, naming the $role role',
			async ({ flag, role }) => {
				engineConfig.authSecret = '';

				await expect(createEngine({ roles: flag }).init()).rejects.toThrow(
					`The ${role} role needs N8N_ENGINE_AUTH_SECRET`,
				);
			},
		);

		it.each([undefined, 'step-worker', 'api,step-worker'])(
			'refuses to boot --roles=%s without the control plane address',
			async (flag) => {
				engineConfig.controlPlaneBaseUrl = '';

				await expect(createEngine({ roles: flag }).init()).rejects.toThrow(
					'The step-worker role needs N8N_ENGINE_CONTROL_PLANE_BASE_URL',
				);
			},
		);

		it.each([
			{ flag: 'orchestrator', withSecret: false },
			{ flag: 'api', withSecret: true },
			{ flag: 'api,orchestrator', withSecret: true },
		])(
			'boots --roles=$flag without the control plane address (shared secret set: $withSecret)',
			async ({ flag, withSecret }) => {
				if (!withSecret) engineConfig.authSecret = '';
				engineConfig.controlPlaneBaseUrl = '';

				await createEngine({ roles: flag }).init();

				expect(runtime.init).toHaveBeenCalled();
			},
		);

		it.each(['api', 'orchestrator', 'step-worker'])(
			'refuses to boot --roles=%s over plain HTTP without the opt-out',
			async (flag) => {
				engineConfig.tlsInsecureAllowPlainHttp = false;

				await expect(createEngine({ roles: flag }).init()).rejects.toThrow(
					'N8N_ENGINE_TLS_INSECURE_ALLOW_PLAIN_HTTP',
				);
			},
		);

		it('refuses an http control plane address when TLS is on', async () => {
			useTls(true);

			await expect(createEngine().init()).rejects.toThrow(
				'N8N_ENGINE_CONTROL_PLANE_BASE_URL must start with https://',
			);
		});

		it('ignores an http control plane address when TLS is on and no role dials it', async () => {
			useTls(true);

			await createEngine({ roles: 'api,orchestrator' }).init();

			expect(runtime.init).toHaveBeenCalled();
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

		describe('roles', () => {
			let initExpressionEngine: MockInstance<typeof Expression.initExpressionEngine>;

			beforeEach(() => {
				initExpressionEngine = vi.spyOn(Expression, 'initExpressionEngine').mockResolvedValue();
			});

			afterEach(() => {
				initExpressionEngine.mockRestore();
			});

			it('runs the roles that N8N_ENGINE_ROLES names', async () => {
				engineConfig.roles = 'orchestrator';

				await createEngine().init();

				expect(runtime.init).toHaveBeenCalledWith(
					expect.objectContaining({ roles: ['orchestrator'] }),
				);
			});

			it.each([undefined, 'step-worker', 'api,step-worker'])(
				'loads the nodes and starts the expression engine and the code execution backend with --roles=%s',
				async (flag) => {
					await createEngine({ roles: flag }).init();

					expect(loadNodesAndCredentials.init).toHaveBeenCalled();
					expect(loadNodesAndCredentials.postProcessLoaders).toHaveBeenCalled();
					expect(initExpressionEngine).toHaveBeenCalled();
					expect(taskRunnerModule.start).toHaveBeenCalled();
				},
			);

			it.each(['api', 'orchestrator', 'api,orchestrator'])(
				'loads no nodes and starts neither the expression engine nor the code execution backend with --roles=%s',
				async (flag) => {
					await createEngine({ roles: flag }).init();

					expect(loadNodesAndCredentials.init).not.toHaveBeenCalled();
					expect(loadNodesAndCredentials.postProcessLoaders).not.toHaveBeenCalled();
					expect(initExpressionEngine).not.toHaveBeenCalled();
					expect(taskRunnerModule.start).not.toHaveBeenCalled();
				},
			);

			it('refuses to boot with an unknown role in N8N_ENGINE_ROLES before it starts anything', async () => {
				engineConfig.roles = 'worker';

				await expect(createEngine().init()).rejects.toThrow(
					'Unknown engine role in N8N_ENGINE_ROLES: worker',
				);
				expect(loadNodesAndCredentials.init).not.toHaveBeenCalled();
				expect(redisClientService.createClient).not.toHaveBeenCalled();
				expect(taskRunnerModule.start).not.toHaveBeenCalled();
				expect(runtime.init).not.toHaveBeenCalled();
			});

			it('names every engine role and the environment variable in the help text of --roles', () => {
				const flagsSchema = Container.get(CommandMetadata).get('engine')?.flagsSchema;
				const allRoles = parseEngineRoles(undefined);

				expect(flagsSchema?.shape.roles.description).toContain(allRoles.join(', '));
				expect(flagsSchema?.shape.roles.description).toContain('N8N_ENGINE_ROLES');
			});
		});

		it('sends execution responses and lifecycle events over Redis', async () => {
			await createEngine().init();

			expect(redisClientService.createClient).toHaveBeenCalledWith({ type: 'publisher(n8n)' });
			expect(runtime.init).toHaveBeenCalledWith({
				responseSender: expect.any(ExecutionChannelSender),
				lifecycleEventSender: expect.any(LifecycleEventChannelSender),
				queues: expect.anything(),
				roles: expect.anything(),
			});
		});

		it('publishes work queue messages on the execution channel connection', async () => {
			publisher.lpush.mockResolvedValue(1);
			await createEngine().init();
			const queues = vi.mocked(runtime.init).mock.calls.at(-1)?.[0].queues;

			await queues?.orchestration.publish({
				type: 'step:settled',
				executionId: 'exec-1',
				stepId: 'step-1',
			});

			expect(redisClientService.createClient).toHaveBeenCalledTimes(1);
			expect(redisClientService.createClient).toHaveBeenCalledWith({ type: 'publisher(n8n)' });
			expect(publisher.lpush).toHaveBeenCalledWith(
				expect.stringMatching(/:engine-v2-queue:orchestration$/),
				expect.any(String),
			);
		});

		it('runs each work queue at the concurrency that the engine config sets for it', async () => {
			engineConfig.orchestrationConcurrency = 2;
			engineConfig.stepConcurrency = 3;

			await createEngine().init();

			expect(createInstanceRedisWorkQueues).toHaveBeenCalledWith(publisher, expect.anything(), {
				orchestration: 2,
				step: 3,
			});
		});

		it('publishes lifecycle events over Redis on the channel of their execution', async () => {
			publisher.publish.mockResolvedValue(1);
			await createEngine().init();
			const lifecycleEventSender = vi
				.mocked(runtime.init)
				.mock.calls.at(-1)?.[0].lifecycleEventSender;

			await lifecycleEventSender?.send(
				[
					{
						type: 'execution:completed',
						executionId: 'exec-1',
						workflowId: 'wf-1',
						at: '2026-10-29T10:00:00.000Z',
					},
				],
				new AbortController().signal,
			);

			expect(publisher.publish).toHaveBeenCalledWith(
				expect.stringMatching(/:engine-v2-lifecycle:exec-1$/),
				expect.any(String),
			);
		});

		it('starts the data plane after the base init and finishes loading the nodes', async () => {
			await createEngine().init();

			expect(runtime.init).toHaveBeenCalled();
			expect(vi.mocked(runtime.init).mock.invocationCallOrder[0]).toBeGreaterThan(
				vi.mocked(loadNodesAndCredentials.init).mock.invocationCallOrder[0],
			);
			expect(loadNodesAndCredentials.postProcessLoaders).toHaveBeenCalled();
		});

		describe('binary data store', () => {
			it('initialises the store without reading the signing secret from the control plane', async () => {
				await createEngine().init();

				expect(binaryDataService.init).toHaveBeenCalledTimes(1);
				expect(binaryDataConfig.initialize).not.toHaveBeenCalled();
			});

			it('refuses database mode at start, before the data plane runs', async () => {
				binaryDataConfig.mode = 'database';

				await expect(createEngine().init()).rejects.toThrow('N8N_DEFAULT_BINARY_DATA_MODE');
				expect(binaryDataService.init).not.toHaveBeenCalled();
				expect(runtime.init).not.toHaveBeenCalled();
			});

			it('refuses s3 mode without a bucket name', async () => {
				binaryDataConfig.mode = 's3';

				await expect(createEngine().init()).rejects.toThrow('N8N_EXTERNAL_STORAGE_S3_BUCKET_NAME');
				expect(binaryDataService.init).not.toHaveBeenCalled();
				expect(runtime.init).not.toHaveBeenCalled();
			});

			it('refuses azure mode without a container name', async () => {
				binaryDataConfig.mode = 'azure';

				await expect(createEngine().init()).rejects.toThrow(
					'N8N_EXTERNAL_STORAGE_AZURE_CONTAINER_NAME',
				);
				expect(binaryDataService.init).not.toHaveBeenCalled();
				expect(runtime.init).not.toHaveBeenCalled();
			});

			it('initialises the store before the data plane starts', async () => {
				await createEngine().init();

				expect(vi.mocked(runtime.init).mock.invocationCallOrder[0]).toBeGreaterThan(
					vi.mocked(binaryDataService.init).mock.invocationCallOrder[0],
				);
			});

			it('starts without an S3 bucket in filesystem mode', async () => {
				await createEngine().init();

				expect(objectStoreService.init).not.toHaveBeenCalled();
				expect(binaryDataService.setManager).not.toHaveBeenCalled();
			});
		});
	});

	describe('stopProcess', () => {
		it('shuts the data plane down before exiting, without touching the crash journal', async () => {
			const engine = createEngine();
			await engine.init();
			await startAndStopWorkQueues();
			const dispose = vi.spyOn(Expression, 'disposeExpressionEngine');
			const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
			try {
				// @ts-expect-error - Accessing protected method for testing
				await engine.stopProcess();

				expect(runtime.shutdown).toHaveBeenCalled();
				expect(workQueueConsumer.disconnect).toHaveBeenCalledTimes(2);
				expect(publisher.disconnect).toHaveBeenCalledTimes(1);
				expect(vi.mocked(runtime.shutdown).mock.invocationCallOrder[0]).toBeLessThan(
					workQueueConsumer.disconnect.mock.invocationCallOrder[0],
				);
				expect(workQueueConsumer.disconnect.mock.invocationCallOrder[1]).toBeLessThan(
					publisher.disconnect.mock.invocationCallOrder[0],
				);
				expect(exit).toHaveBeenCalledExactlyOnceWith();
				expect(vi.mocked(runtime.shutdown).mock.invocationCallOrder[0]).toBeLessThan(
					exit.mock.invocationCallOrder[0],
				);
				expect(CrashJournal.cleanup).not.toHaveBeenCalled();
				expect(dbConnection.close).not.toHaveBeenCalled();
				// In-flight steps still evaluate expressions until the engine has stopped.
				expect(vi.mocked(runtime.shutdown).mock.invocationCallOrder[0]).toBeLessThan(
					dispose.mock.invocationCallOrder[0],
				);
			} finally {
				dispose.mockRestore();
				exit.mockRestore();
			}
		});

		it('closes every Redis connection and reports every error when the data plane fails to shut down', async () => {
			const engine = createEngine();
			await engine.init();
			await startAndStopWorkQueues();
			const shutdownError = new Error('shutdown failed');
			runtime.shutdown.mockRejectedValueOnce(shutdownError);
			const disconnectError = new Error('disconnect failed');
			publisher.disconnect.mockImplementationOnce(() => {
				throw disconnectError;
			});
			// @ts-expect-error - Accessing protected method for testing
			const exitWithCrash = vi.spyOn(engine, 'exitWithCrash').mockResolvedValue(undefined);
			const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
			try {
				// @ts-expect-error - Accessing protected method for testing
				await engine.stopProcess();

				expect(publisher.disconnect).toHaveBeenCalledTimes(1);
				expect(workQueueConsumer.disconnect).toHaveBeenCalledTimes(2);
				expect(exitWithCrash).toHaveBeenCalledWith(
					'There was an error shutting down the engine.',
					expect.objectContaining({ errors: [shutdownError, disconnectError] }),
				);
			} finally {
				exit.mockRestore();
			}
		});

		it('reports a single release error through the crash path', async () => {
			const engine = createEngine();
			await engine.init();
			const shutdownError = new Error('shutdown failed');
			runtime.shutdown.mockRejectedValueOnce(shutdownError);
			// @ts-expect-error - Accessing protected method for testing
			const exitWithCrash = vi.spyOn(engine, 'exitWithCrash').mockResolvedValue(undefined);
			const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
			try {
				// @ts-expect-error - Accessing protected method for testing
				await engine.stopProcess();

				expect(exitWithCrash).toHaveBeenCalledWith(
					'There was an error shutting down the engine.',
					expect.objectContaining({ errors: [shutdownError] }),
				);
			} finally {
				exit.mockRestore();
			}
		});
	});
});
