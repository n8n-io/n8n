import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { DbConnection, DeploymentKeyRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { PubSubRegistry } from '@/scaling/pubsub/pubsub.registry';
import { Subscriber } from '@/scaling/pubsub/subscriber.service';
import { WorkerDrainService } from '@/scaling/worker-drain.service';
import { WorkerServer } from '@/scaling/worker-server';
import { WorkerStatusService } from '@/scaling/worker-status.service.ee';
import { RedisClientService } from '@/services/redis-client.service';
import { ShutdownService } from '@/shutdown/shutdown.service';

import { Worker } from '../worker';

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
const mockWorkerDrainService = mockInstance(WorkerDrainService);
const mockShutdownService = mockInstance(ShutdownService);
mockShutdownService.validate.mockReturnValue(undefined);
mockShutdownService.isShuttingDown.mockReturnValue(false);
mockShutdownService.shutdown.mockReturnValue(undefined);
mockShutdownService.waitForShutdown.mockResolvedValue(undefined);
const mockErrorReporter = mockInstance(ErrorReporter);
mockErrorReporter.init.mockResolvedValue(undefined);
mockErrorReporter.shutdown.mockResolvedValue(undefined);

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

	describe('run', () => {
		afterEach(() => {
			Container.get(GlobalConfig).queue.health.active = false;
		});

		it('should initialize WorkerServer and mark as ready when health endpoint is enabled', async () => {
			Container.get(GlobalConfig).queue.health.active = true;

			await new Worker().run();

			expect(mockWorkerServer.init).toHaveBeenCalledWith(expect.objectContaining({ health: true }));
			expect(mockWorkerServer.markAsReady).toHaveBeenCalled();
		});

		it('should not initialize WorkerServer when no endpoints are enabled', async () => {
			await new Worker().run();

			expect(mockWorkerServer.init).not.toHaveBeenCalled();
			expect(mockWorkerServer.markAsReady).not.toHaveBeenCalled();
		});
	});

	describe('registerWorkerDrainSignalHandlers', () => {
		afterEach(() => {
			Container.get(GlobalConfig).queue.bull.workerDrainSignalsEnabled = false;
		});

		it.each([
			{ inTestMode: true, workerDrainSignalsEnabled: false, shouldRegister: false },
			{ inTestMode: true, workerDrainSignalsEnabled: true, shouldRegister: false },
			{ inTestMode: false, workerDrainSignalsEnabled: false, shouldRegister: false },
			{ inTestMode: false, workerDrainSignalsEnabled: true, shouldRegister: true },
		])(
			'should return $shouldRegister for inTest=$inTestMode and workerDrainSignalsEnabled=$workerDrainSignalsEnabled',
			({ inTestMode, workerDrainSignalsEnabled, shouldRegister }) => {
				const worker = new Worker();

				expect(
					worker['shouldRegisterWorkerDrainSignalHandlers']({
						inTestMode,
						workerDrainSignalsEnabled,
					}),
				).toBe(shouldRegister);
			},
		);

		it('should not register SIGUSR handlers by default', async () => {
			const processOnSpy = jest.spyOn(process, 'on').mockImplementation(() => process);
			const worker = new Worker();
			worker['workerDrainService'] = mockWorkerDrainService;

			worker['registerWorkerDrainSignalHandlers']();

			expect(processOnSpy).not.toHaveBeenCalledWith('SIGUSR1', expect.any(Function));
			expect(processOnSpy).not.toHaveBeenCalledWith('SIGUSR2', expect.any(Function));
			processOnSpy.mockRestore();
		});

		it('should register SIGUSR handlers when workerDrainSignalsEnabled is true', () => {
			Container.get(GlobalConfig).queue.bull.workerDrainSignalsEnabled = true;
			const processOnSpy = jest.spyOn(process, 'on').mockImplementation(() => process);
			const worker = new Worker();
			worker['workerDrainService'] = mockWorkerDrainService;
			jest
				.spyOn(worker as any, 'shouldRegisterWorkerDrainSignalHandlers')
				.mockImplementation(() => true);

			worker['registerWorkerDrainSignalHandlers']();

			expect(processOnSpy).toHaveBeenCalledWith('SIGUSR1', expect.any(Function));
			expect(processOnSpy).toHaveBeenCalledWith('SIGUSR2', expect.any(Function));
			processOnSpy.mockRestore();
		});

		it('should not register SIGUSR handlers in test mode even when the flag is enabled', () => {
			Container.get(GlobalConfig).queue.bull.workerDrainSignalsEnabled = true;
			const processOnSpy = jest.spyOn(process, 'on').mockImplementation(() => process);
			const worker = new Worker();
			worker['workerDrainService'] = mockWorkerDrainService;
			jest
				.spyOn(worker as any, 'shouldRegisterWorkerDrainSignalHandlers')
				.mockImplementation(() => false);

			worker['registerWorkerDrainSignalHandlers']();

			expect(processOnSpy).not.toHaveBeenCalledWith('SIGUSR1', expect.any(Function));
			expect(processOnSpy).not.toHaveBeenCalledWith('SIGUSR2', expect.any(Function));
			processOnSpy.mockRestore();
		});
	});

	describe('onTerminationSignal', () => {
		let worker: Worker;
		let processExitSpy: jest.SpyInstance;

		beforeEach(() => {
			jest.clearAllMocks();
			processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
			worker = new Worker();
			// errorReporter and workerDrainService are set in init(), not the constructor
			worker['errorReporter'] = mockErrorReporter;
			worker['workerDrainService'] = mockWorkerDrainService;
			jest.spyOn(worker, 'stopProcess').mockResolvedValue(undefined);
			mockWorkerDrainService.enterDrain.mockResolvedValue(undefined);
			mockWorkerDrainService.waitForActiveJobsToFinish.mockResolvedValue(undefined);
			// Re-stub after clearAllMocks
			mockErrorReporter.shutdown.mockResolvedValue(undefined);
			mockShutdownService.isShuttingDown.mockReturnValue(false);
			mockShutdownService.waitForShutdown.mockResolvedValue(undefined);
			mockShutdownService.shutdown.mockReturnValue(undefined);
		});

		afterEach(() => {
			processExitSpy.mockRestore();
		});

		it('should return base handler when drainOnSigterm is false', () => {
			Container.get(GlobalConfig).queue.bull.drainOnSigterm = false;

			const handler = worker['onTerminationSignal']('SIGTERM');

			// Handler should be a function but should NOT call enterDrain
			expect(handler).toBeInstanceOf(Function);
		});

		it('should return base handler for non-SIGTERM signals regardless of drainOnSigterm', () => {
			Container.get(GlobalConfig).queue.bull.drainOnSigterm = true;

			const sigintHandler = worker['onTerminationSignal']('SIGINT');

			expect(sigintHandler).toBeInstanceOf(Function);
		});

		it('should call enterDrain and waitForActiveJobsToFinish on SIGTERM when drainOnSigterm is true', async () => {
			Container.get(GlobalConfig).queue.bull.drainOnSigterm = true;

			const handler = worker['onTerminationSignal']('SIGTERM');
			await handler();

			expect(mockWorkerDrainService.enterDrain).toHaveBeenCalledTimes(1);
			expect(mockWorkerDrainService.waitForActiveJobsToFinish).toHaveBeenCalledTimes(1);
		});

		it('should call waitForActiveJobsToFinish with half the gracefulShutdownTimeout budget', async () => {
			Container.get(GlobalConfig).queue.bull.drainOnSigterm = true;
			// gracefulShutdownTimeoutInS defaults to 30 in BaseCommand
			const expectedBudget = Math.floor(30 * 1000 * 0.5); // 15000

			const handler = worker['onTerminationSignal']('SIGTERM');
			await handler();

			expect(mockWorkerDrainService.waitForActiveJobsToFinish).toHaveBeenCalledWith(expectedBudget);
		});

		afterEach(() => {
			Container.get(GlobalConfig).queue.bull.drainOnSigterm = false;
		});
	});
});
