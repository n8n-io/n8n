import { Config } from '@oclif/core';
import { Worker } from '@/commands/worker';
import config from '@/config';
import { Telemetry } from '@/telemetry';
import { ExternalSecretsManager } from '@/ExternalSecrets/ExternalSecretsManager.ee';
import { BinaryDataService } from 'n8n-core';
import { CacheService } from '@/services/cache/cache.service';
import { RedisServicePubSubPublisher } from '@/services/redis/RedisServicePubSubPublisher';
import { RedisServicePubSubSubscriber } from '@/services/redis/RedisServicePubSubSubscriber';
import { MessageEventBus } from '@/eventbus/MessageEventBus/MessageEventBus';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { CredentialTypes } from '@/CredentialTypes';
import { NodeTypes } from '@/NodeTypes';
import { InternalHooks } from '@/InternalHooks';
import { PostHogClient } from '@/posthog';
import { RedisService } from '@/services/redis.service';
import { OrchestrationHandlerWorkerService } from '@/services/orchestration/worker/orchestration.handler.worker.service';
import { OrchestrationWorkerService } from '@/services/orchestration/worker/orchestration.worker.service';
import { OrchestrationService } from '@/services/orchestration.service';

import * as testDb from '../shared/testDb';
import { mockInstance } from '../../shared/mocking';

const oclifConfig = new Config({ root: __dirname });

beforeAll(async () => {
	config.set('executions.mode', 'queue');
	config.set('binaryDataManager.availableModes', 'filesystem');
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
	mockInstance(OrchestrationService);
	await testDb.init();
	await oclifConfig.load();
});

afterAll(async () => {
	await testDb.terminate();
});

test('worker initializes all its components', async () => {
	const worker = new Worker([], oclifConfig);

	jest.spyOn(worker, 'init');
	jest.spyOn(worker, 'initLicense').mockImplementation(async () => {});
	jest.spyOn(worker, 'initBinaryDataService').mockImplementation(async () => {});
	jest.spyOn(worker, 'initExternalHooks').mockImplementation(async () => {});
	jest.spyOn(worker, 'initExternalSecrets').mockImplementation(async () => {});
	jest.spyOn(worker, 'initEventBus').mockImplementation(async () => {});
	jest.spyOn(worker, 'initOrchestration');
	jest
		.spyOn(OrchestrationWorkerService.prototype, 'publishToEventLog')
		.mockImplementation(async () => {});
	jest
		.spyOn(OrchestrationHandlerWorkerService.prototype, 'initSubscriber')
		.mockImplementation(async () => {});
	jest.spyOn(RedisServicePubSubPublisher.prototype, 'init').mockImplementation(async () => {});
	jest.spyOn(worker, 'initQueue').mockImplementation(async () => {});

	await worker.init();

	expect(worker.queueModeId).toBeDefined();
	expect(worker.queueModeId).toContain('worker');
	expect(worker.queueModeId.length).toBeGreaterThan(15);
	expect(worker.initLicense).toHaveBeenCalledTimes(1);
	expect(worker.initBinaryDataService).toHaveBeenCalledTimes(1);
	expect(worker.initExternalHooks).toHaveBeenCalledTimes(1);
	expect(worker.initExternalSecrets).toHaveBeenCalledTimes(1);
	expect(worker.initEventBus).toHaveBeenCalledTimes(1);
	expect(worker.initOrchestration).toHaveBeenCalledTimes(1);
	expect(OrchestrationHandlerWorkerService.prototype.initSubscriber).toHaveBeenCalledTimes(1);
	expect(OrchestrationWorkerService.prototype.publishToEventLog).toHaveBeenCalledTimes(1);
	expect(worker.initQueue).toHaveBeenCalledTimes(1);

	jest.restoreAllMocks();
});
