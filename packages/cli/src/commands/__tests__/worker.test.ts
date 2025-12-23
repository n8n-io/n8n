import { mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import { PubSubRegistry } from '@/scaling/pubsub/pubsub.registry';
import { Subscriber } from '@/scaling/pubsub/subscriber.service';
import { WorkerStatusService } from '@/scaling/worker-status.service.ee';
import { RedisClientService } from '@/services/redis-client.service';

import { Worker } from '../worker';

mockInstance(RedisClientService);
mockInstance(PubSubRegistry);
const mockSubscriber = mockInstance(Subscriber);
mockInstance(WorkerStatusService);

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
});
