import { mockInstance } from '@n8n/backend-test-utils';
import { DbConnection, DeploymentKeyRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { BinaryDataConfig } from 'n8n-core';

import { DeprecationService } from '@/deprecation/deprecation.service';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { LogStreamingEventRelay } from '@/events/relays/log-streaming.event-relay';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { PubSubRegistry } from '@/scaling/pubsub/pubsub.registry';
import { Subscriber } from '@/scaling/pubsub/subscriber.service';
import { JwtService } from '@/services/jwt.service';
import { RedisClientService } from '@/services/redis-client.service';
import { WebhookServer } from '@/webhooks/webhook-server';

import { BaseCommand } from '../base-command';
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
const mockLoadNodesAndCredentials = mockInstance(LoadNodesAndCredentials);
mockLoadNodesAndCredentials.postProcessLoaders.mockResolvedValue(undefined);

mockInstance(DeprecationService);
mockInstance(JwtService, { initialize: jest.fn().mockResolvedValue(undefined) });
mockInstance(BinaryDataConfig, { initialize: jest.fn().mockResolvedValue(undefined) });
mockInstance(MessageEventBus, { initialize: jest.fn().mockResolvedValue(undefined) });
mockInstance(LogStreamingEventRelay);

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

	describe('init', () => {
		let baseInitSpy: jest.SpyInstance;

		beforeEach(() => {
			baseInitSpy = jest.spyOn(BaseCommand.prototype, 'init').mockResolvedValue(undefined);
		});

		afterEach(() => {
			baseInitSpy.mockRestore();
		});

		it('should call executionContextHookRegistry.init before LoadNodesAndCredentials.postProcessLoaders', async () => {
			const webhook = new Webhook();

			// @ts-expect-error - Accessing protected property for testing
			webhook.globalConfig = { executions: { mode: 'queue' } };
			// @ts-expect-error - Accessing protected method for testing
			webhook.initCrashJournal = jest.fn().mockResolvedValue(undefined);
			webhook.initLicense = jest.fn().mockResolvedValue(undefined);
			// @ts-expect-error - Accessing protected method for testing
			webhook.initCommunityPackages = jest.fn().mockResolvedValue(undefined);
			webhook.initOrchestration = jest.fn().mockResolvedValue(undefined);
			webhook.initBinaryDataService = jest.fn().mockResolvedValue(undefined);
			// @ts-expect-error - Accessing protected method for testing
			webhook.initDataDeduplicationService = jest.fn().mockResolvedValue(undefined);
			webhook.initExternalHooks = jest.fn().mockResolvedValue(undefined);
			// @ts-expect-error - Accessing protected property for testing
			webhook.moduleRegistry = { initModules: jest.fn().mockResolvedValue(undefined) };
			// @ts-expect-error - Accessing protected property for testing
			webhook.instanceSettings = {
				hostId: 'test',
				instanceType: 'webhook',
				initialize: jest.fn().mockResolvedValue(undefined),
			};
			// @ts-expect-error - Accessing protected property for testing
			webhook.executionContextHookRegistry = {
				init: jest.fn().mockResolvedValue(undefined),
			};

			await webhook.init();

			// @ts-expect-error - Accessing protected property for testing
			const hookInitMock = webhook.executionContextHookRegistry.init as jest.Mock;
			const postProcessMock = mockLoadNodesAndCredentials.postProcessLoaders as jest.Mock;

			expect(hookInitMock).toHaveBeenCalled();
			expect(postProcessMock).toHaveBeenCalled();
			expect(hookInitMock.mock.invocationCallOrder[0]).toBeLessThan(
				postProcessMock.mock.invocationCallOrder[0],
			);
		});
	});
});
