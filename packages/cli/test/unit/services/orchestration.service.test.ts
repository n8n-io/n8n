import Container from 'typedi';
import config from '@/config';
import { LoggerProxy } from 'n8n-workflow';
import { getLogger } from '@/Logger';
import { RedisService } from '@/services/redis.service';
import { OrchestrationService } from '@/services/orchestration.service';
import type { RedisServiceWorkerResponseObject } from '@/services/redis/RedisServiceCommands';
import { EventMessageWorkflow } from '@/eventbus/EventMessageClasses/EventMessageWorkflow';
import { eventBus } from '@/eventbus';
import * as EventHelpers from '@/eventbus/EventMessageClasses/Helpers';

const redisService = Container.get(RedisService);
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
		LoggerProxy.init(getLogger());
		await os.init('test-orchestration-service');
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
		setDefaultConfig();
	});

	test('should handle worker responses', async () => {
		const response = await os.handleWorkerResponseMessage(
			JSON.stringify(workerRestartEventbusResponse),
		);
		expect(response.command).toEqual('restartEventBus');
	});

	test('should handle event messages', async () => {
		const response = await os.handleEventBusMessage(JSON.stringify(eventBusMessage));
		jest.spyOn(eventBus, 'send');
		jest.spyOn(EventHelpers, 'getEventMessageObjectByType');
		expect(eventBus.send).toHaveBeenCalled();
		expect(response.eventName).toEqual('n8n.workflow.success');
		jest.spyOn(eventBus, 'send').mockReset();
		jest.spyOn(EventHelpers, 'getEventMessageObjectByType').mockReset();
	});

	test('should handle command messages from others', async () => {
		jest.spyOn(eventBus, 'restart');
		const responseFalseId = await os.handleCommandMessage(
			JSON.stringify(workerRestartEventbusResponse),
		);
		expect(responseFalseId).toBeDefined();
		expect(responseFalseId!.command).toEqual('restartEventBus');
		expect(responseFalseId!.senderId).toEqual('test');
		expect(eventBus.restart).toHaveBeenCalled();
		jest.spyOn(eventBus, 'restart').mockReset();
	});

	test('should reject command messages from iteslf', async () => {
		jest.spyOn(eventBus, 'restart');
		const response = await os.handleCommandMessage(
			JSON.stringify({ ...workerRestartEventbusResponse, senderId: os.uniqueInstanceId }),
		);
		expect(response).toBeDefined();
		expect(response!.command).toEqual('restartEventBus');
		expect(response!.senderId).toEqual(os.uniqueInstanceId);
		expect(eventBus.restart).not.toHaveBeenCalled();
		jest.spyOn(eventBus, 'restart').mockReset();
	});

	test('should send command messages', async () => {
		jest.spyOn(os.redisPublisher, 'publishToCommandChannel');
		await os.getWorkerIds();
		expect(os.redisPublisher.publishToCommandChannel).toHaveBeenCalled();
		jest.spyOn(os.redisPublisher, 'publishToCommandChannel').mockReset();
	});

	afterAll(async () => {
		await os.shutdown();
	});
});
