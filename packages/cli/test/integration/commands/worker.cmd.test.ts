import { mockInstance } from '../shared/utils/';
import { Worker } from '@/commands/worker';
import * as Config from '@oclif/config';
import config from '@/config';
import { LoggerProxy } from 'n8n-workflow';
import { Telemetry } from '@/telemetry';
import { getLogger } from '@/Logger';
import { ExternalSecretsManager } from '@/ExternalSecrets/ExternalSecretsManager.ee';
import { BinaryDataService } from 'n8n-core';
import { CacheService } from '@/services/cache.service';
import { RedisServicePubSubPublisher } from '@/services/redis/RedisServicePubSubPublisher';
import { RedisServicePubSubSubscriber } from '@/services/redis/RedisServicePubSubSubscriber';
import { MessageEventBus } from '@/eventbus/MessageEventBus/MessageEventBus';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { CredentialTypes } from '@/CredentialTypes';
import { NodeTypes } from '@/NodeTypes';
import { InternalHooks } from '@/InternalHooks';
import { PostHogClient } from '@/posthog';
import { RedisService } from '@/services/redis.service';

const oclifConfig: Config.IConfig = new Config.Config({ root: __dirname });

beforeAll(async () => {
	LoggerProxy.init(getLogger());
	config.set('executions.mode', 'queue');
	mockInstance(Telemetry);
	mockInstance(PostHogClient);
	mockInstance(InternalHooks);
	mockInstance(CacheService);
	mockInstance(ExternalSecretsManager);
	mockInstance(BinaryDataService);
	mockInstance(MessageEventBus);
	mockInstance(LoadNodesAndCredentials);
	mockInstance(CredentialTypes);
	mockInstance(NodeTypes);
	mockInstance(RedisService);
	mockInstance(RedisServicePubSubPublisher);
	mockInstance(RedisServicePubSubSubscriber);
});

test('worker initializes all its components', async () => {
	const worker = new Worker([], oclifConfig);

	jest.spyOn(worker, 'init');
	jest.spyOn(worker, 'initLicense').mockImplementation(async () => {});
	jest.spyOn(worker, 'initBinaryDataService').mockImplementation(async () => {});
	jest.spyOn(worker, 'initExternalHooks').mockImplementation(async () => {});
	jest.spyOn(worker, 'initExternalSecrets').mockImplementation(async () => {});
	jest.spyOn(worker, 'initEventBus').mockImplementation(async () => {});
	jest.spyOn(worker, 'initRedis');
	jest.spyOn(RedisServicePubSubPublisher.prototype, 'init').mockImplementation(async () => {});
	jest
		.spyOn(RedisServicePubSubPublisher.prototype, 'publishToEventLog')
		.mockImplementation(async () => {});
	jest
		.spyOn(RedisServicePubSubSubscriber.prototype, 'subscribeToCommandChannel')
		.mockImplementation(async () => {});
	jest
		.spyOn(RedisServicePubSubSubscriber.prototype, 'addMessageHandler')
		.mockImplementation(async () => {});
	jest.spyOn(worker, 'initQueue').mockImplementation(async () => {});

	await worker.init();

	expect(worker.queueModeId).toBeDefined();
	expect(worker.queueModeId).toContain('worker');
	expect(worker.queueModeId.length).toBeGreaterThan(15);
	expect(worker.initLicense).toHaveBeenCalled();
	expect(worker.initBinaryDataService).toHaveBeenCalled();
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
	expect(worker.initQueue).toHaveBeenCalled();

	jest.restoreAllMocks();
});
