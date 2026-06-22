import type { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { ExecutionsConfig } from '@n8n/config';
import { GlobalConfig } from '@n8n/config';
import { DbConnection, DeploymentKeyRepository } from '@n8n/db';
import type { ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { IWorkflowExecutionDataProcess } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import type { ConcurrencyControlService } from '@/concurrency/concurrency-control.service';
import type { EventService } from '@/events/event.service';
import type { ExecutionPersistence } from '@/executions/execution-persistence';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { PubSubRegistry } from '@/scaling/pubsub/pubsub.registry';
import { Subscriber } from '@/scaling/pubsub/subscriber.service';
import { WorkerServer } from '@/scaling/worker-server';
import { WorkerStatusService } from '@/scaling/worker-status.service.ee';
import { RedisClientService } from '@/services/redis-client.service';

import { Worker } from '../worker';

jest.mock('@/crash-journal');

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

describe('Worker', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('initOrchestration', () => {
		it('should instantiate WorkerStatusService during orchestration setup', async () => {
			const containerGetSpy = jest.spyOn(Container, 'get');

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
			const initSpy = jest.spyOn(pubSubRegistry, 'init');

			await new Worker().initOrchestration();

			expect(initSpy).toHaveBeenCalled();
		});
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

			const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

			jest.useFakeTimers();

			try {
				const worker = new Worker();
				// Mock to avoid calling `init()`
				(worker as unknown as { dbConnection: DbConnection }).dbConnection = dbConnection;
				const stopPromise = worker.stopProcess();

				// While the execution is in flight, shutdown must stay in the drain
				// loop without closing the DB connection.
				await jest.advanceTimersByTimeAsync(drainLoopInterval * 3);
				expect(dbConnection.close).not.toHaveBeenCalled();

				// On execution complete, post-execution hook persists the result,
				// then it is removed from the active executions.
				await executionPersistence.updateExistingExecution(executionId, { status: 'success' });
				realActiveExecutions.finalizeExecution(executionId);

				await jest.advanceTimersByTimeAsync(drainLoopInterval);

				await stopPromise;
			} finally {
				jest.useRealTimers();
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
		const mockScalingService = { setupWorker: jest.fn() };
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
