import Container from 'typedi';
import type Redis from 'ioredis';
import { mock } from 'jest-mock-extended';
import { InstanceSettings } from 'n8n-core';
import type { WorkflowActivateMode } from 'n8n-workflow';

import config from '@/config';
import { OrchestrationService } from '@/services/orchestration.service';
import type { RedisServiceWorkerResponseObject } from '@/services/redis/redis-service-commands';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { RedisService } from '@/services/redis.service';
import { handleWorkerResponseMessageMain } from '@/services/orchestration/main/handle-worker-response-message-main';
import { handleCommandMessageMain } from '@/services/orchestration/main/handle-command-message-main';
import { OrchestrationHandlerMainService } from '@/services/orchestration/main/orchestration.handler.main.service';
import * as helpers from '@/services/orchestration/helpers';
import { ExternalSecretsManager } from '@/external-secrets/external-secrets-manager.ee';
import { Logger } from '@/logger';
import { Push } from '@/push';
import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { mockInstance } from '@test/mocking';
import { RedisClientService } from '@/services/redis/redis-client.service';
import type { MainResponseReceivedHandlerOptions } from '../orchestration/main/types';

const instanceSettings = Container.get(InstanceSettings);
const redisClientService = mockInstance(RedisClientService);
const mockRedisClient = mock<Redis>();
redisClientService.createClient.mockReturnValue(mockRedisClient);

const os = Container.get(OrchestrationService);
const handler = Container.get(OrchestrationHandlerMainService);
mockInstance(ActiveWorkflowManager);

let queueModeId: string;

function setDefaultConfig() {
	config.set('executions.mode', 'queue');
	config.set('generic.instanceType', 'main');
}

const workerRestartEventBusResponse: RedisServiceWorkerResponseObject = {
	senderId: 'test',
	workerId: 'test',
	command: 'restartEventBus',
	payload: {
		result: 'success',
	},
};

describe('Orchestration Service', () => {
	const logger = mockInstance(Logger);
	mockInstance(Push);
	mockInstance(RedisService);
	mockInstance(ExternalSecretsManager);
	const eventBus = mockInstance(MessageEventBus);

	beforeAll(async () => {
		jest.mock('@/services/redis/redis-service-pub-sub-publisher', () => {
			return jest.fn().mockImplementation(() => {
				return {
					init: jest.fn(),
					publishToEventLog: jest.fn(),
					publishToWorkerChannel: jest.fn(),
					destroy: jest.fn(),
				};
			});
		});
		jest.mock('@/services/redis/redis-service-pub-sub-subscriber', () => {
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

	beforeEach(() => {
		instanceSettings.markAsLeader();
	});

	afterAll(async () => {
		jest.mock('@/services/redis/redis-service-pub-sub-publisher').restoreAllMocks();
		jest.mock('@/services/redis/redis-service-pub-sub-subscriber').restoreAllMocks();
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
			JSON.stringify(workerRestartEventBusResponse),
			mock<MainResponseReceivedHandlerOptions>(),
		);
		expect(response?.command).toEqual('restartEventBus');
	});

	test('should handle command messages from others', async () => {
		const responseFalseId = await handleCommandMessageMain(
			JSON.stringify({
				senderId: 'test',
				command: 'reloadLicense',
			}),
		);
		expect(responseFalseId).toBeDefined();
		expect(responseFalseId!.command).toEqual('reloadLicense');
		expect(responseFalseId!.senderId).toEqual('test');
		expect(logger.error).toHaveBeenCalled();
	});

	test('should reject command messages from itself', async () => {
		const response = await handleCommandMessageMain(
			JSON.stringify({ ...workerRestartEventBusResponse, senderId: queueModeId }),
		);
		expect(response).toBeDefined();
		expect(response!.command).toEqual('restartEventBus');
		expect(response!.senderId).toEqual(queueModeId);
		expect(eventBus.restart).not.toHaveBeenCalled();
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
		expect(res2!.payload).toEqual({ result: 'debounced' });
	});

	describe('shouldAddWebhooks', () => {
		test('should return true for init', () => {
			// We want to ensure that webhooks are populated on init
			// more https://github.com/n8n-io/n8n/pull/8830
			const result = os.shouldAddWebhooks('init');
			expect(result).toBe(true);
		});

		test('should return false for leadershipChange', () => {
			const result = os.shouldAddWebhooks('leadershipChange');
			expect(result).toBe(false);
		});

		test('should return true for update or activate when is leader', () => {
			const modes = ['update', 'activate'] as WorkflowActivateMode[];
			for (const mode of modes) {
				const result = os.shouldAddWebhooks(mode);
				expect(result).toBe(true);
			}
		});

		test('should return false for update or activate when not leader', () => {
			instanceSettings.markAsFollower();
			const modes = ['update', 'activate'] as WorkflowActivateMode[];
			for (const mode of modes) {
				const result = os.shouldAddWebhooks(mode);
				expect(result).toBe(false);
			}
		});
	});
});
