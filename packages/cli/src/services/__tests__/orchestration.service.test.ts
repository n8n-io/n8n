import type Redis from 'ioredis';
import { mock } from 'jest-mock-extended';
import { InstanceSettings } from 'n8n-core';
import type { WorkflowActivateMode } from 'n8n-workflow';
import Container from 'typedi';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import config from '@/config';
import { ExternalSecretsManager } from '@/external-secrets/external-secrets-manager.ee';
import { Push } from '@/push';
import { OrchestrationService } from '@/services/orchestration.service';
import { RedisClientService } from '@/services/redis-client.service';
import { mockInstance } from '@test/mocking';

config.set('executions.mode', 'queue');
config.set('generic.instanceType', 'main');

const instanceSettings = Container.get(InstanceSettings);
const redisClientService = mockInstance(RedisClientService);
const mockRedisClient = mock<Redis>();
redisClientService.createClient.mockReturnValue(mockRedisClient);

const os = Container.get(OrchestrationService);
mockInstance(ActiveWorkflowManager);

let queueModeId: string;

describe('Orchestration Service', () => {
	mockInstance(Push);
	mockInstance(ExternalSecretsManager);

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
		// @ts-expect-error Private field
		expect(os.publisher).toBeDefined();
		expect(queueModeId).toBeDefined();
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
