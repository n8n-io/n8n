import { mockInstance } from '../shared/utils/';
import { Worker } from '@/commands/worker';
import * as Config from '@oclif/config';
import { default as appConfig } from '@/config';
import { Queue } from '@/Queue';
import { LoggerProxy } from 'n8n-workflow';
import { Telemetry } from '@/telemetry';
import { getLogger } from '@/Logger';
import { ExternalSecretsManager } from '../../../src/ExternalSecrets/ExternalSecretsManager.ee';
import { BinaryDataManager } from 'n8n-core';
import { CacheService } from '../../../src/services/cache.service';
import { RedisServicePubSubPublisher } from '../../../src/services/redis/RedisServicePubSubPublisher';
import { RedisServicePubSubSubscriber } from '../../../src/services/redis/RedisServicePubSubSubscriber';
import { MessageEventBus, eventBus } from '../../../src/eventbus/MessageEventBus/MessageEventBus';

const config: Config.IConfig = new Config.Config({ root: __dirname });

beforeAll(async () => {
	LoggerProxy.init(getLogger());
	mockInstance(Telemetry);
	mockInstance(CacheService);
	mockInstance(ExternalSecretsManager);
	mockInstance(BinaryDataManager);
	mockInstance(MessageEventBus);

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
	jest.mock('ioredis', () => {
		const Redis = require('ioredis-mock');
		if (typeof Redis === 'object') {
			// the first mock is an ioredis shim because ioredis-mock depends on it
			// https://github.com/stipsan/ioredis-mock/blob/master/src/index.js#L101-L111
			return {
				Command: { _transformer: { argument: {}, reply: {} } },
			};
		}
		// second mock for our code
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return function (...args: any) {
			return new Redis(args);
		};
	});
	appConfig.set('executions.mode', 'queue');
});

afterAll(async () => {
	jest.resetAllMocks();
});

// eslint-disable-next-line n8n-local-rules/no-skipped-tests
test.skip('worker initializes all its components', async () => {
	const worker = new Worker([], config);

	jest.spyOn(worker, 'init');
	jest.spyOn(worker, 'initLicense');
	jest.spyOn(worker, 'initBinaryManager').mockImplementation(async () => {});
	jest.spyOn(worker, 'initExternalHooks');
	jest.spyOn(worker, 'initExternalSecrets');
	jest.spyOn(worker, 'initEventBus');
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
	expect(eventBus.initialize).toHaveBeenCalled();

	expect(worker.initRedis).toHaveBeenCalled();
	expect(worker.redisPublisher).toBeDefined();
	expect(worker.redisPublisher.init).toHaveBeenCalled();
	expect(worker.redisPublisher.publishToEventLog).toHaveBeenCalled();
	expect(worker.redisSubscriber).toBeDefined();
	expect(worker.redisSubscriber.subscribeToCommandChannel).toHaveBeenCalled();
	expect(worker.redisSubscriber.addMessageHandler).toHaveBeenCalled();
	expect(worker.redisSubscriber.messageHandlers.size).toBeGreaterThan(0);

	expect(worker.initQueue).toHaveBeenCalled();
});
