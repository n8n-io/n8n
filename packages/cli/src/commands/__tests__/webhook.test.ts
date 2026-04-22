import { mockInstance } from '@n8n/backend-test-utils';
import { DbConnection, DeploymentKeyRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { PubSubRegistry } from '@/scaling/pubsub/pubsub.registry';
import { Subscriber } from '@/scaling/pubsub/subscriber.service';
import { RedisClientService } from '@/services/redis-client.service';
import { WebhookServer } from '@/webhooks/webhook-server';

import { Webhook } from '../webhook';

jest.mock('@/scaling/scaling.service', () => ({
	ScalingService: class {},
}));

const dbConnection = mockInstance(DbConnection);
dbConnection.init.mockResolvedValue(undefined);
dbConnection.migrate.mockResolvedValue(undefined);

const deploymentKeyRepository = mockInstance(DeploymentKeyRepository);
deploymentKeyRepository.findActiveByType.mockResolvedValue(null);
deploymentKeyRepository.insertOrIgnore.mockResolvedValue(undefined);

mockInstance(RedisClientService);
mockInstance(PubSubRegistry);
const mockSubscriber = mockInstance(Subscriber);
const mockWebhookServer = mockInstance(WebhookServer);
mockInstance(LoadNodesAndCredentials);

describe('Webhook', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('initOrchestration', () => {
		it('should get command channel and subscribe to it', async () => {
			const mockCommandChannel = 'n8n:n8n.commands';
			mockSubscriber.getCommandChannel.mockReturnValue(mockCommandChannel);
			mockSubscriber.subscribe.mockResolvedValue(undefined);

			await new Webhook().initOrchestration();

			expect(mockSubscriber.getCommandChannel).toHaveBeenCalled();
			expect(mockSubscriber.subscribe).toHaveBeenCalledWith(mockCommandChannel);
		});

		it('should initialize PubSubRegistry', async () => {
			const pubSubRegistry = Container.get(PubSubRegistry);
			const initSpy = jest.spyOn(pubSubRegistry, 'init');

			await new Webhook().initOrchestration();

			expect(initSpy).toHaveBeenCalled();
		});
	});

	describe('run', () => {
		beforeEach(() => {
			const { ScalingService } = jest.requireMock<{ ScalingService: new () => unknown }>(
				'@/scaling/scaling.service',
			);
			Container.set(ScalingService, { setupQueue: jest.fn() });
		});

		it('should call markAsReady after server starts', async () => {
			// run() blocks forever with `await new Promise(() => {})`,
			// so we don't await it — just let microtasks settle
			void new Webhook().run();

			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(mockWebhookServer.start).toHaveBeenCalled();
			expect(mockWebhookServer.markAsReady).toHaveBeenCalled();
		});
	});
});
