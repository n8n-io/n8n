import type { Logger } from '@n8n/backend-common';
import { uninstallGlobalProxyAgent } from '@n8n/backend-network/testing';
import { mockInstance } from '@n8n/backend-test-utils';
import type { ExecutionsConfig } from '@n8n/config';
import { GlobalConfig } from '@n8n/config';
import { DbConnection, DeploymentKeyRepository } from '@n8n/db';
import type { ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { BinaryDataConfig, ErrorReporter } from 'n8n-core';
import type { IWorkflowExecutionDataProcess } from 'n8n-workflow';
import http from 'node:http';
import https from 'node:https';
import { mock } from 'vitest-mock-extended';

import { ActiveExecutions } from '@/active-executions';
import type { ConcurrencyControlService } from '@/concurrency/concurrency-control.service';
import { CredentialsOverwrites } from '@/credentials-overwrites';
import { DeprecationService } from '@/deprecation/deprecation.service';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import type { EventService } from '@/events/event.service';
import { ActivityEventRelay } from '@/events/relays/activity.event-relay';
import { TelemetryEventRelay } from '@/events/relays/telemetry.event-relay';
import { WorkflowFailureNotificationEventRelay } from '@/events/relays/workflow-failure-notification.event-relay';
import type { ExecutionPersistence } from '@/executions/execution-persistence';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { CommunityPackagesConfig } from '@/modules/community-packages/community-packages.config';
import { NodeTypes } from '@/node-types';
import { PostHogClient } from '@/posthog';
import { PubSubRegistry } from '@/scaling/pubsub/pubsub.registry';
import { Subscriber } from '@/scaling/pubsub/subscriber.service';
import { WorkerServer } from '@/scaling/worker-server';
import { WorkerStatusService } from '@/scaling/worker-status.service.ee';
import { JwtService } from '@/services/jwt.service';
import { RedisClientService } from '@/services/redis-client.service';
import { ShutdownService } from '@/shutdown/shutdown.service';
import { TaskRunnerModule } from '@/task-runners/task-runner-module';

import { Worker } from '../worker';

vi.mock('@/crash-journal');

const dbConnection = mockInstance(DbConnection);
dbConnection.init.mockResolvedValue(undefined);
dbConnection.migrate.mockResolvedValue(undefined);

const deploymentKeyRepository = mockInstance(DeploymentKeyRepository);
deploymentKeyRepository.findActiveByType.mockResolvedValue(null);
deploymentKeyRepository.insertOrIgnore.mockResolvedValue(undefined);

mockInstance(RedisClientService);
mockInstance(PubSubRegistry);
const mockSubscriber = mockInstance(Subscriber);
mockInstance(WorkerStatusService);
const mockWorkerServer = mockInstance(WorkerServer);
mockInstance(LoadNodesAndCredentials);
const activeExecutions = mockInstance(ActiveExecutions);

// Mocks for services reached by the full `init()` path, as in start.test.ts
mockInstance(ErrorReporter);
mockInstance(NodeTypes);
mockInstance(ShutdownService);
mockInstance(MessageEventBus);
mockInstance(PostHogClient);
mockInstance(TelemetryEventRelay);
mockInstance(ActivityEventRelay);
mockInstance(WorkflowFailureNotificationEventRelay);
mockInstance(DeprecationService);
mockInstance(CredentialsOverwrites);
mockInstance(CommunityPackagesConfig, { enabled: false });
mockInstance(JwtService);
mockInstance(BinaryDataConfig);
mockInstance(TaskRunnerModule);

describe('Worker', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	/** Worker with the init steps that go beyond `super.init()` stubbed, as in start.test.ts. */
	const createWorkerForInit = (globalConfigOverrides: Record<string, unknown> = {}) => {
		const worker = new Worker();

		// @ts-expect-error - Overriding readonly property for testing
		worker.globalConfig = {
			executions: { mode: 'regular' },
			multiMainSetup: { enabled: false },
			endpoints: { metrics: { enable: false }, health: '/health' },
			database: { type: 'sqlite' },
			sentry: { backendDsn: '' },
			cache: { backend: 'memory' },
			taskRunners: {},
			outboundProxy: { mode: 'main-only' },
			expressionEngine: { engine: 'legacy', poolSize: 1, maxCodeCacheSize: 1024 },
			queue: { bull: { gracefulShutdownTimeout: 20 }, workerPool: { enabled: false, name: '' } },
			generic: { gracefulShutdownTimeout: 30 },
			...globalConfigOverrides,
		};

		worker.setConcurrency = vi.fn().mockResolvedValue(undefined);
		worker.initLicense = vi.fn().mockResolvedValue(undefined);
		worker.initBinaryDataService = vi.fn().mockResolvedValue(undefined);
		// @ts-expect-error - Accessing protected method for testing
		worker.initDataDeduplicationService = vi.fn().mockResolvedValue(undefined);
		worker.initExternalHooks = vi.fn().mockResolvedValue(undefined);
		worker.initEventBus = vi.fn().mockResolvedValue(undefined);
		worker.initScalingService = vi.fn().mockResolvedValue(undefined);
		worker.initOrchestration = vi.fn().mockResolvedValue(undefined);
		// @ts-expect-error - Accessing protected property for testing
		worker.moduleRegistry = { initModules: vi.fn().mockResolvedValue(undefined) };
		// @ts-expect-error - Accessing protected property for testing
		worker.executionContextHookRegistry = { init: vi.fn().mockResolvedValue(undefined) };

		return worker;
	};

	describe('initOrchestration', () => {
		it('should instantiate WorkerStatusService during orchestration setup', async () => {
			const containerGetSpy = vi.spyOn(Container, 'get');

			await new Worker().initOrchestration();

			expect(containerGetSpy).toHaveBeenCalledWith(WorkerStatusService);
		});

		it('should get command channel and subscribe to it', async () => {
			const mockCommandChannel = 'n8n:n8n.commands';
			mockSubscriber.getCommandChannel.mockReturnValue(mockCommandChannel);
			mockSubscriber.subscribe.mockResolvedValue(undefined);

			await new Worker().initOrchestration();

			expect(mockSubscriber.getCommandChannel).toHaveBeenCalled();
			expect(mockSubscriber.subscribe).toHaveBeenCalledWith(mockCommandChannel);
		});

		it('should initialize PubSubRegistry', async () => {
			const pubSubRegistry = Container.get(PubSubRegistry);
			const initSpy = pubSubRegistry.init;

			await new Worker().initOrchestration();

			expect(initSpy).toHaveBeenCalled();
		});
	});

	describe('installOutboundProxyAgents', () => {
		const workerWithOutboundProxyMode = (mode: 'all' | 'main-only') => {
			const worker = new Worker();
			// @ts-expect-error - Accessing protected property for testing
			worker.globalConfig = { outboundProxy: { mode } };
			return worker;
		};

		afterEach(() => {
			uninstallGlobalProxyAgent();
			vi.unstubAllEnvs();
		});

		it('should install env-proxy global agents in `all` mode', () => {
			vi.stubEnv('HTTPS_PROXY', 'http://proxy.host.invalid:3128');

			// @ts-expect-error - Accessing protected method for testing
			workerWithOutboundProxyMode('all').installOutboundProxyAgents();

			expect(http.globalAgent.constructor.name).toBe('EnvProxyHttpAgent');
			expect(https.globalAgent.constructor.name).toBe('EnvProxyHttpsAgent');
		});

		it('should keep plain global agents in `main-only` mode, as workers are not the main server', () => {
			uninstallGlobalProxyAgent();
			vi.stubEnv('HTTPS_PROXY', 'http://proxy.host.invalid:3128');

			// @ts-expect-error - Accessing protected method for testing
			workerWithOutboundProxyMode('main-only').installOutboundProxyAgents();

			expect(http.globalAgent.constructor.name).toBe('Agent');
			expect(https.globalAgent.constructor.name).toBe('Agent');
		});

		it('should install env-proxy global agents on `init()`, via the base command', async () => {
			vi.stubEnv('HTTPS_PROXY', 'http://proxy.host.invalid:3128');

			await createWorkerForInit({ outboundProxy: { mode: 'all' } }).init();

			expect(http.globalAgent.constructor.name).toBe('EnvProxyHttpAgent');
			expect(https.globalAgent.constructor.name).toBe('EnvProxyHttpsAgent');
		});
	});

	describe('init', () => {
		afterEach(() => {
			vi.unstubAllEnvs();
		});

		it.each([
			{ envValue: '45', expected: 45, case: 'the parsed value' },
			{ envValue: 'not-a-number', expected: 20, case: 'the queue default when unparseable' },
			{ envValue: '45seconds', expected: 20, case: 'the queue default when partly numeric' },
			{ envValue: '0', expected: 20, case: 'the queue default when zero' },
			{ envValue: '-45', expected: 20, case: 'the queue default when negative' },
		])(
			'should apply QUEUE_WORKER_TIMEOUT as $case to both the shutdown and the drain timeout',
			async ({ envValue, expected }) => {
				vi.stubEnv('QUEUE_WORKER_TIMEOUT', envValue);

				const worker = createWorkerForInit();

				await worker.init();

				// @ts-expect-error - Accessing protected property for testing
				expect(worker.gracefulShutdownTimeoutInS).toBe(expected);
				// @ts-expect-error - Accessing protected property for testing
				expect(worker.globalConfig.generic.gracefulShutdownTimeout).toBe(expected);
			},
		);
	});

	describe('stopProcess', () => {
		it('should keep the DB connection open until in-flight executions have persisted', async () => {
			// In-process executions on a worker e.g. sub-workflows started by
			// Execute Workflow are tracked in `ActiveExecutions`, not as Bull
			// jobs; use a real instance with one in-flight execution.
			const executionPersistence = mock<ExecutionPersistence>();
			executionPersistence.create.mockResolvedValue('test');
			const realActiveExecutions = new ActiveExecutions(
				mock<Logger>(),
				mock<ExecutionRepository>(),
				executionPersistence,
				mock<ConcurrencyControlService>(),
				mock<EventService>(),
				mock<ExecutionsConfig>({ mode: 'queue' }),
			);

			const drainLoopInterval = 500;

			Container.set(ActiveExecutions, realActiveExecutions);

			const executionId = await realActiveExecutions.add(mock<IWorkflowExecutionDataProcess>());

			const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

			vi.useFakeTimers();

			try {
				const worker = new Worker();
				// Mock to avoid calling `init()`
				(worker as unknown as { dbConnection: DbConnection }).dbConnection = dbConnection;
				const stopPromise = worker.stopProcess();

				// While the execution is in flight, shutdown must stay in the drain
				// loop without closing the DB connection.
				await vi.advanceTimersByTimeAsync(drainLoopInterval * 3);
				expect(dbConnection.close).not.toHaveBeenCalled();

				// On execution complete, post-execution hook persists the result,
				// then it is removed from the active executions.
				await executionPersistence.updateExistingExecution(executionId, { status: 'success' });
				realActiveExecutions.finalizeExecution(executionId);

				await vi.advanceTimersByTimeAsync(drainLoopInterval);

				await stopPromise;
			} finally {
				vi.useRealTimers();
				exitSpy.mockRestore();
				Container.set(ActiveExecutions, activeExecutions);
			}

			expect(dbConnection.close).toHaveBeenCalled();
			expect(executionPersistence.updateExistingExecution.mock.invocationCallOrder[0]).toBeLessThan(
				dbConnection.close.mock.invocationCallOrder[0],
			);
		});
	});

	describe('run', () => {
		// `run()` registers the job processor, so it needs a scaling service and
		// concurrency in place (normally set during `init()`).
		const mockScalingService = { setupWorker: vi.fn() };
		const createWorkerForRun = () => {
			const worker = new Worker();

			// Assign private properties
			Object.assign(worker, {
				scalingService: mockScalingService,
				concurrency: 10,
			});

			return worker;
		};

		afterEach(() => {
			Container.get(GlobalConfig).queue.health.active = false;
		});

		it('should initialize WorkerServer and mark as ready when health endpoint is enabled', async () => {
			Container.get(GlobalConfig).queue.health.active = true;

			await createWorkerForRun().run();

			expect(mockWorkerServer.init).toHaveBeenCalledWith(expect.objectContaining({ health: true }));
			expect(mockScalingService.setupWorker).toHaveBeenCalledWith(10);
			expect(mockWorkerServer.markAsReady).toHaveBeenCalled();

			// The job processor must be registered before the server reports ready,
			// so jobs are never pulled while the worker is still advertised as not ready.
			expect(mockScalingService.setupWorker.mock.invocationCallOrder[0]).toBeLessThan(
				mockWorkerServer.markAsReady.mock.invocationCallOrder[0],
			);
		});

		it('should not initialize WorkerServer when no endpoints are enabled', async () => {
			await createWorkerForRun().run();

			expect(mockWorkerServer.init).not.toHaveBeenCalled();
			expect(mockWorkerServer.markAsReady).not.toHaveBeenCalled();
			// The job processor is registered regardless of whether endpoints are enabled.
			expect(mockScalingService.setupWorker).toHaveBeenCalledWith(10);
		});
	});
});

test('worker needs the expression engine', () => {
	expect(new Worker().needsExpressionEngine).toBe(true);
});
