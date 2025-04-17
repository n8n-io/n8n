import { Container } from '@n8n/di';
import type Redis from 'ioredis';
import { mock } from 'jest-mock-extended';
import { InstanceSettings } from 'n8n-core';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import config from '@/config';
import { ExternalSecretsManager } from '@/external-secrets.ee/external-secrets-manager.ee';
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

describe('Orchestration Service', () => {
	mockInstance(Push);
	mockInstance(ExternalSecretsManager);

	beforeAll(async () => {
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
	});
});
