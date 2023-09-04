import { mockInstance } from '../shared/utils/';
import { Worker } from '@/commands/worker';
import * as Config from '@oclif/config';
import { default as appConfig } from '@/config';
import { Queue } from '@/Queue';
import { LoggerProxy } from 'n8n-workflow';
import { Telemetry } from '@/telemetry';
import { getLogger } from '@/Logger';
import { ExternalSecretsManager } from '@/ExternalSecrets/ExternalSecretsManager.ee';
import { BinaryDataManager } from 'n8n-core';
import { CacheService } from '@/services/cache.service';
import { RedisServicePubSubPublisher } from '@/services/redis/RedisServicePubSubPublisher';
import { RedisServicePubSubSubscriber } from '@/services/redis/RedisServicePubSubSubscriber';
import { MessageEventBus } from '@/eventbus/MessageEventBus/MessageEventBus';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { CredentialTypes } from '@/CredentialTypes';
import { NodeTypes } from '@/NodeTypes';
import { InternalHooks } from '@/InternalHooks';
import { PostHogClient } from '@/posthog';

const config: Config.IConfig = new Config.Config({ root: __dirname });

beforeAll(async () => {
	LoggerProxy.init(getLogger());
	mockInstance(Telemetry);
	mockInstance(PostHogClient);
	mockInstance(InternalHooks);
	mockInstance(CacheService);
	mockInstance(ExternalSecretsManager);
	mockInstance(BinaryDataManager);
	mockInstance(MessageEventBus);
	mockInstance(LoadNodesAndCredentials);
	mockInstance(CredentialTypes);
	mockInstance(NodeTypes);
});

beforeEach(async () => {
	Queue.prototype.getBullObjectInstance = jest.fn().mockImplementation(() => ({
		pause: jest.fn(),
		process: jest.fn(),
		on: jest.fn(),
		client: () => {
			ping: jest.fn();
		},
	}));
	jest.mock('../../../src/services/redis/RedisServicePubSubPublisher', () => {
		return jest.fn().mockImplementation(() => {
			return {
				init: jest.fn(),
				publishToEventLog: jest.fn(),
				publishToWorkerChannel: jest.fn(),
			};
		});
	});
	jest.mock('../../../src/CrashJournal', () => {
		return {
			init: jest.fn(),
		};
	});
	jest.mock('../../../src/Db', () => {
		return {
			init: jest.fn(),
			migrate: jest.fn(),
		};
	});
	jest.mock('../../../src/services/redis/RedisServicePubSubSubscriber', () => {
		return jest.fn().mockImplementation(() => {
			return {
				subscribeToCommandChannel: jest.fn(),
			};
		});
	});
	jest.mock('../../../src/eventbus/MessageEventBus/MessageEventBus', () => {
		return jest.fn().mockImplementation(() => {
			return {
				initialize: jest.fn(),
			};
		});
	});
	appConfig.set('executions.mode', 'queue');
});

afterEach(async () => {
	jest.mock('../../../src/services/redis/RedisServicePubSubPublisher').restoreAllMocks();
	jest.mock('../../../src/services/redis/RedisServicePubSubSubscriber').restoreAllMocks();
	jest.mock('../../../src/eventbus/MessageEventBus/MessageEventBus').restoreAllMocks();
	jest.mock('../../../src/CrashJournal').restoreAllMocks();
	jest.mock('../../../src/Db').restoreAllMocks();
	jest.mock('ioredis').restoreAllMocks();
});

afterAll(async () => {
	jest.restoreAllMocks();
});

// eslint-disable-next-line n8n-local-rules/no-skipped-tests
test('worker initializes all its components', async () => {
	const worker = new Worker([], config);

	jest.spyOn(worker, 'init');
	jest.spyOn(worker, 'initLicense').mockImplementation(async () => {});
	jest.spyOn(worker, 'initBinaryManager').mockImplementation(async () => {});
	jest.spyOn(worker, 'initExternalHooks').mockImplementation(async () => {});
	jest.spyOn(worker, 'initExternalSecrets').mockImplementation(async () => {});
	jest.spyOn(worker, 'initEventBus').mockImplementation(async () => {});
	jest.spyOn(worker, 'initRedis');
	jest.spyOn(RedisServicePubSubPublisher.prototype, 'init');
	jest.spyOn(RedisServicePubSubPublisher.prototype, 'publishToEventLog');
	jest.spyOn(RedisServicePubSubSubscriber.prototype, 'subscribeToCommandChannel');
	jest.spyOn(RedisServicePubSubSubscriber.prototype, 'addMessageHandler');
	jest.spyOn(worker, 'initQueue');

	await worker.init();

	expect(worker.uniqueInstanceId).toBeDefined();
	expect(worker.uniqueInstanceId).toContain('worker');
	expect(worker.uniqueInstanceId.length).toBeGreaterThan(15);
	expect(Queue.prototype.getBullObjectInstance).toHaveBeenCalled();
	expect(worker.initLicense).toHaveBeenCalled();
	expect(worker.initBinaryManager).toHaveBeenCalled();
	expect(worker.initExternalHooks).toHaveBeenCalled();
	expect(worker.initExternalSecrets).toHaveBeenCalled();
	expect(worker.initEventBus).toHaveBeenCalled();
	expect(worker.initRedis).toHaveBeenCalled();
	expect(worker.redisPublisher).toBeDefined();
	expect(worker.redisPublisher.init).toHaveBeenCalled();
	expect(worker.redisPublisher.publishToEventLog).toHaveBeenCalled();
	expect(worker.redisSubscriber).toBeDefined();
	expect(worker.redisSubscriber.subscribeToCommandChannel).toHaveBeenCalled();
	expect(worker.redisSubscriber.addMessageHandler).toHaveBeenCalled();
	expect(worker.redisSubscriber.messageHandlers.size).toBeGreaterThan(0);
	expect(worker.initQueue).toHaveBeenCalled();

	jest.restoreAllMocks();
});
