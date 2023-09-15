import Container from 'typedi';
import config from '@/config';
import { LoggerProxy } from 'n8n-workflow';
import { getLogger } from '@/Logger';
import { OrchestrationService } from '@/services/orchestration.service';
import type { RedisServiceWorkerResponseObject } from '@/services/redis/RedisServiceCommands';
import { EventMessageWorkflow } from '@/eventbus/EventMessageClasses/EventMessageWorkflow';
import { eventBus } from '@/eventbus';
import { RedisService } from '@/services/redis.service';
import { mockInstance } from '../../integration/shared/utils';
import { handleWorkerResponseMessage } from '../../../src/services/orchestration/handleWorkerResponseMessage';
import { handleCommandMessage } from '../../../src/services/orchestration/handleCommandMessage';
import { License } from '../../../src/License';

const os = Container.get(OrchestrationService);

function setDefaultConfig() {
	config.set('executions.mode', 'queue');
}

const workerRestartEventbusResponse: RedisServiceWorkerResponseObject = {
	senderId: 'test',
	workerId: 'test',
	command: 'restartEventBus',
	payload: {
		result: 'success',
	},
};

const eventBusMessage = new EventMessageWorkflow({
	eventName: 'n8n.workflow.success',
	id: 'test',
	message: 'test',
	payload: {
		test: 'test',
	},
});

describe('Orchestration Service', () => {
	beforeAll(async () => {
		mockInstance(RedisService);
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
	});

	afterAll(async () => {
		jest.mock('../../../src/services/redis/RedisServicePubSubPublisher').restoreAllMocks();
		jest.mock('../../../src/services/redis/RedisServicePubSubSubscriber').restoreAllMocks();
		await os.shutdown();
	});

	test('should initialize', async () => {
		await os.init('test-orchestration-service');
		expect(os.redisPublisher).toBeDefined();
		expect(os.redisSubscriber).toBeDefined();
		expect(os.uniqueInstanceId).toBeDefined();
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
			os.uniqueInstanceId,
		);
		expect(responseFalseId).toBeDefined();
		expect(responseFalseId!.command).toEqual('reloadLicense');
		expect(responseFalseId!.senderId).toEqual('test');
		expect(license.reload).toHaveBeenCalled();
		jest.spyOn(license, 'reload').mockRestore();
	});

	test('should reject command messages from iteslf', async () => {
		jest.spyOn(eventBus, 'restart');
		const response = await handleCommandMessage(
			JSON.stringify({ ...workerRestartEventbusResponse, senderId: os.uniqueInstanceId }),
			os.uniqueInstanceId,
		);
		expect(response).toBeDefined();
		expect(response!.command).toEqual('restartEventBus');
		expect(response!.senderId).toEqual(os.uniqueInstanceId);
		expect(eventBus.restart).not.toHaveBeenCalled();
		jest.spyOn(eventBus, 'restart').mockRestore();
	});

	test('should send command messages', async () => {
		jest.spyOn(os.redisPublisher, 'publishToCommandChannel');
		await os.getWorkerIds();
		expect(os.redisPublisher.publishToCommandChannel).toHaveBeenCalled();
		jest.spyOn(os.redisPublisher, 'publishToCommandChannel').mockRestore();
	});
});
