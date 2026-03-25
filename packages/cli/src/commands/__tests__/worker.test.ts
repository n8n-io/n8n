import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { PubSubRegistry } from '@/scaling/pubsub/pubsub.registry';
import { Subscriber } from '@/scaling/pubsub/subscriber.service';
import { WorkerServer } from '@/scaling/worker-server';
import { WorkerStatusService } from '@/scaling/worker-status.service.ee';
import { RedisClientService } from '@/services/redis-client.service';

import { Worker } from '../worker';

mockInstance(RedisClientService);
mockInstance(PubSubRegistry);
const mockSubscriber = mockInstance(Subscriber);
mockInstance(WorkerStatusService);
const mockWorkerServer = mockInstance(WorkerServer);
mockInstance(LoadNodesAndCredentials);

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
});
