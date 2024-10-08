import type Redis from 'ioredis';
import { mock } from 'jest-mock-extended';
import { InstanceSettings } from 'n8n-core';
import type { WorkflowActivateMode } from 'n8n-workflow';
import Container from 'typedi';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import config from '@/config';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { ExternalSecretsManager } from '@/external-secrets/external-secrets-manager.ee';
import { Push } from '@/push';
import type { PubSub } from '@/scaling/pubsub/pubsub.types';
import * as helpers from '@/services/orchestration/helpers';
import { handleCommandMessageMain } from '@/services/orchestration/main/handle-command-message-main';
import { handleWorkerResponseMessageMain } from '@/services/orchestration/main/handle-worker-response-message-main';
import { OrchestrationHandlerMainService } from '@/services/orchestration/main/orchestration.handler.main.service';
import { OrchestrationService } from '@/services/orchestration.service';
import { RedisClientService } from '@/services/redis-client.service';
import { mockInstance } from '@test/mocking';

import type { MainResponseReceivedHandlerOptions } from '../orchestration/main/types';

config.set('executions.mode', 'queue');
config.set('generic.instanceType', 'main');

const instanceSettings = Container.get(InstanceSettings);
const redisClientService = mockInstance(RedisClientService);
const mockRedisClient = mock<Redis>();
redisClientService.createClient.mockReturnValue(mockRedisClient);

const os = Container.get(OrchestrationService);
const handler = Container.get(OrchestrationHandlerMainService);
mockInstance(ActiveWorkflowManager);

let queueModeId: string;

const workerRestartEventBusResponse: PubSub.WorkerResponse = {
	workerId: 'test',
	command: 'restart-event-bus',
	payload: {
		result: 'success',
	},
};

describe('Orchestration Service', () => {
	mockInstance(Push);
	mockInstance(ExternalSecretsManager);
	const eventBus = mockInstance(MessageEventBus);

	beforeAll(async () => {
		queueModeId = config.get('redis.queueModeId');

		// @ts-expect-error readonly property
		instanceSettings.instanceType = 'main';
	});

	beforeEach(() => {
		instanceSettings.markAsLeader();
	});

	afterAll(async () => {
		await os.shutdown();
	});

	test('should initialize', async () => {
		await os.init();
		await handler.init();
		// @ts-expect-error Private field
		expect(os.publisher).toBeDefined();
		// @ts-expect-error Private field
		expect(handler.subscriber).toBeDefined();
		expect(queueModeId).toBeDefined();
	});

	test('should handle worker responses', async () => {
		const response = await handleWorkerResponseMessageMain(
			JSON.stringify(workerRestartEventBusResponse),
			mock<MainResponseReceivedHandlerOptions>(),
		);
		expect(response?.command).toEqual('restart-event-bus');
	});

	test('should handle command messages from others', async () => {
		const responseFalseId = await handleCommandMessageMain(
			JSON.stringify({
				senderId: 'test',
				command: 'reload-license',
			}),
		);
		expect(responseFalseId).toBeDefined();
		expect(responseFalseId!.command).toEqual('reload-license');
		expect(responseFalseId!.senderId).toEqual('test');
	});

	test('should reject command messages from itself', async () => {
		const response = await handleCommandMessageMain(
			JSON.stringify({ ...workerRestartEventBusResponse, senderId: queueModeId }),
		);
		expect(response).toBeDefined();
		expect(response!.command).toEqual('restart-event-bus');
		expect(response!.senderId).toEqual(queueModeId);
		expect(eventBus.restart).not.toHaveBeenCalled();
	});

	test('should send command messages', async () => {
		// @ts-expect-error Private field
		jest.spyOn(os.publisher, 'publishCommand').mockImplementation(async () => {});
		await os.getWorkerIds();
		// @ts-expect-error Private field
		expect(os.publisher.publishCommand).toHaveBeenCalled();
		// @ts-expect-error Private field
		jest.spyOn(os.publisher, 'publishCommand').mockRestore();
	});

	test('should prevent receiving commands too often', async () => {
		jest.spyOn(helpers, 'debounceMessageReceiver');
		const res1 = await handleCommandMessageMain(
			JSON.stringify({
				senderId: 'test',
				command: 'reload-external-secrets-providers',
			}),
		);
		const res2 = await handleCommandMessageMain(
			JSON.stringify({
				senderId: 'test',
				command: 'reload-external-secrets-providers',
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
