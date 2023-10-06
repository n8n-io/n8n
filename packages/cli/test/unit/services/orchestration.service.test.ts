import Container from 'typedi';
import config from '@/config';
import { LoggerProxy } from 'n8n-workflow';
import { getLogger } from '@/Logger';
import { OrchestrationMainService } from '@/services/orchestration/main/orchestration.main.service';
import type { RedisServiceWorkerResponseObject } from '@/services/redis/RedisServiceCommands';
import { eventBus } from '@/eventbus';
import { RedisService } from '@/services/redis.service';
import { mockInstance } from '../../integration/shared/utils';
import { handleWorkerResponseMessageMain } from '@/services/orchestration/main/handleWorkerResponseMessageMain';
import { handleCommandMessageMain } from '@/services/orchestration/main/handleCommandMessageMain';
import { OrchestrationHandlerMainService } from '@/services/orchestration/main/orchestration.handler.main.service';
import * as helpers from '@/services/orchestration/helpers';
import { ExternalSecretsManager } from '@/ExternalSecrets/ExternalSecretsManager.ee';

const os = Container.get(OrchestrationMainService);
const handler = Container.get(OrchestrationHandlerMainService);

let queueModeId: string;

function setDefaultConfig() {
	config.set('executions.mode', 'queue');
	config.set('generic.instanceType', 'main');
}

const workerRestartEventbusResponse: RedisServiceWorkerResponseObject = {
	senderId: 'test',
	workerId: 'test',
	command: 'restartEventBus',
	payload: {
		result: 'success',
	},
};

describe('Orchestration Service', () => {
	beforeAll(async () => {
		mockInstance(RedisService);
		mockInstance(ExternalSecretsManager);
		LoggerProxy.init(getLogger());
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
		jest.mock('../../../src/services/redis/RedisServicePubSubPublisher', () => {
			return jest.fn().mockImplementation(() => {
				return {
					init: jest.fn(),
					publishToEventLog: jest.fn(),
					publishToWorkerChannel: jest.fn(),
					destroy: jest.fn(),
				};
			});
		});
		jest.mock('../../../src/services/redis/RedisServicePubSubSubscriber', () => {
			return jest.fn().mockImplementation(() => {
				return {
					subscribeToCommandChannel: jest.fn(),
					destroy: jest.fn(),
				};
			});
		});
		setDefaultConfig();
		queueModeId = config.get('redis.queueModeId');
	});

	afterAll(async () => {
		jest.mock('../../../src/services/redis/RedisServicePubSubPublisher').restoreAllMocks();
		jest.mock('../../../src/services/redis/RedisServicePubSubSubscriber').restoreAllMocks();
		await os.shutdown();
	});

	test('should initialize', async () => {
		await os.init();
		await handler.init();
		expect(os.redisPublisher).toBeDefined();
		expect(handler.redisSubscriber).toBeDefined();
		expect(queueModeId).toBeDefined();
	});

	test('should handle worker responses', async () => {
		const response = await handleWorkerResponseMessageMain(
			JSON.stringify(workerRestartEventbusResponse),
		);
		expect(response.command).toEqual('restartEventBus');
	});

	test('should handle command messages from others', async () => {
		jest.spyOn(LoggerProxy, 'error');
		const responseFalseId = await handleCommandMessageMain(
			JSON.stringify({
				senderId: 'test',
				command: 'reloadLicense',
			}),
		);
		expect(responseFalseId).toBeDefined();
		expect(responseFalseId!.command).toEqual('reloadLicense');
		expect(responseFalseId!.senderId).toEqual('test');
		expect(LoggerProxy.error).toHaveBeenCalled();
		jest.spyOn(LoggerProxy, 'error').mockRestore();
	});

	test('should reject command messages from iteslf', async () => {
		jest.spyOn(eventBus, 'restart');
		const response = await handleCommandMessageMain(
			JSON.stringify({ ...workerRestartEventbusResponse, senderId: queueModeId }),
		);
		expect(response).toBeDefined();
		expect(response!.command).toEqual('restartEventBus');
		expect(response!.senderId).toEqual(queueModeId);
		expect(eventBus.restart).not.toHaveBeenCalled();
		jest.spyOn(eventBus, 'restart').mockRestore();
	});

	test('should send command messages', async () => {
		setDefaultConfig();
		jest.spyOn(os.redisPublisher, 'publishToCommandChannel').mockImplementation(async () => {});
		await os.getWorkerIds();
		expect(os.redisPublisher.publishToCommandChannel).toHaveBeenCalled();
		jest.spyOn(os.redisPublisher, 'publishToCommandChannel').mockRestore();
	});

	test('should prevent receiving commands too often', async () => {
		setDefaultConfig();
		jest.spyOn(helpers, 'debounceMessageReceiver');
		const res1 = await handleCommandMessageMain(
			JSON.stringify({
				senderId: 'test',
				command: 'reloadExternalSecretsProviders',
			}),
		);
		const res2 = await handleCommandMessageMain(
			JSON.stringify({
				senderId: 'test',
				command: 'reloadExternalSecretsProviders',
			}),
		);
		expect(helpers.debounceMessageReceiver).toHaveBeenCalledTimes(2);
		expect(res1!.payload).toBeUndefined();
		expect(res2!.payload!.result).toEqual('debounced');
	});
});
