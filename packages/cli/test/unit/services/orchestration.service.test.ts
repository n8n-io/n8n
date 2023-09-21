import Container from 'typedi';
import config from '@/config';
import { LoggerProxy } from 'n8n-workflow';
import { getLogger } from '@/Logger';
import { OrchestrationService } from '@/services/orchestration.service';
import type { RedisServiceWorkerResponseObject } from '@/services/redis/RedisServiceCommands';
import { eventBus } from '@/eventbus';
import { License } from '@/License';
import { handleWorkerResponseMessage } from '@/services/orchestration/handleWorkerResponseMessage';
import { handleCommandMessage } from '@/services/orchestration/handleCommandMessage';
import { RedisServicePubSubSubscriber } from '@/services/redis/RedisServicePubSubSubscriber';
import { RedisServicePubSubPublisher } from '@/services/redis/RedisServicePubSubPublisher';
import { RedisServiceListReceiver } from '@/services/redis/RedisServiceListReceiver';
import { RedisServiceListSender } from '@/services/redis/RedisServiceListSender';
import { RedisServiceStreamConsumer } from '@/services/redis/RedisServiceStreamConsumer';
import { RedisServiceStreamProducer } from '@/services/redis/RedisServiceStreamProducer';
import { mockInstance } from '../../integration/shared/utils';

describe('Orchestration Service', () => {
	config.set('executions.mode', 'queue');
	mockInstance(RedisServicePubSubSubscriber);
	mockInstance(RedisServicePubSubPublisher);
	mockInstance(RedisServiceListReceiver);
	mockInstance(RedisServiceListSender);
	mockInstance(RedisServiceStreamConsumer);
	mockInstance(RedisServiceStreamProducer);
	const service = Container.get(OrchestrationService);

	const workerRestartEventbusResponse: RedisServiceWorkerResponseObject = {
		senderId: 'test',
		workerId: 'test',
		command: 'restartEventBus',
		payload: {
			result: 'success',
		},
	};

	beforeAll(async () => {
		LoggerProxy.init(getLogger());
	});

	afterAll(async () => {
		jest.restoreAllMocks();
		await service.shutdown();
	});

	test('should initialize', async () => {
		await service.init();
		expect(service.redisPublisher).toBeDefined();
		expect(service.redisSubscriber).toBeDefined();
	});

	test('should handle worker responses', async () => {
		const response = await handleWorkerResponseMessage(
			JSON.stringify(workerRestartEventbusResponse),
		);
		expect(response.command).toEqual('restartEventBus');
	});

	test('should handle command messages from others', async () => {
		const license = Container.get(License);
		license.instanceId = 'test';
		jest.spyOn(license, 'reload');
		const responseFalseId = await handleCommandMessage(
			JSON.stringify({
				senderId: 'test',
				command: 'reloadLicense',
			}),
		);
		expect(responseFalseId).toBeDefined();
		expect(responseFalseId!.command).toEqual('reloadLicense');
		expect(responseFalseId!.senderId).toEqual('test');
		expect(license.reload).toHaveBeenCalled();
		jest.spyOn(license, 'reload').mockRestore();
	});

	test('should reject command messages from itself', async () => {
		jest.spyOn(eventBus, 'restart');
		const response = await handleCommandMessage(
			JSON.stringify({ ...workerRestartEventbusResponse }),
		);
		expect(response).toBeDefined();
		expect(response!.command).toEqual('restartEventBus');
		expect(eventBus.restart).not.toHaveBeenCalled();
		jest.spyOn(eventBus, 'restart').mockRestore();
	});

	test('should send command messages', async () => {
		jest.spyOn(service.redisPublisher, 'publishToCommandChannel');
		await service.getWorkerIds();
		expect(service.redisPublisher.publishToCommandChannel).toHaveBeenCalled();
		jest.spyOn(service.redisPublisher, 'publishToCommandChannel').mockRestore();
	});
});
