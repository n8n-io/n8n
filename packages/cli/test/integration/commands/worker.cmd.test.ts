import { mockInstance } from '../shared/utils/';
import { Worker } from '@/commands/worker';
import * as Config from '@oclif/config';
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
import { RedisService } from '@/services/redis.service';

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
	mockInstance(RedisService);
	mockInstance(RedisServicePubSubPublisher);
	mockInstance(RedisServicePubSubSubscriber);
});

test('worker initializes all its components', async () => {
	const worker = new Worker([], config);

	jest.spyOn(worker, 'init');
	jest.spyOn(worker, 'initLicense').mockImplementation(async () => {});
	jest.spyOn(worker, 'initBinaryManager').mockImplementation(async () => {});
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

	expect(worker.uniqueInstanceId).toBeDefined();
	expect(worker.uniqueInstanceId).toContain('worker');
	expect(worker.uniqueInstanceId.length).toBeGreaterThan(15);
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
	expect(worker.initQueue).toHaveBeenCalled();

	jest.restoreAllMocks();
});
