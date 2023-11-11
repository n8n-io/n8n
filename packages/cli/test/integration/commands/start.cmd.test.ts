import * as Config from '@oclif/config';
import { DataSource } from 'typeorm';

import { Start } from '@/commands/start';
import { BaseCommand } from '@/commands/BaseCommand';
import config from '@/config';
import { License } from '@/License';
import { ExternalSecretsManager } from '@/ExternalSecrets/ExternalSecretsManager.ee';
import { MultiMainSetup } from '@/services/orchestration/main/MultiMainSetup.ee';
import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import { WorkflowHistoryManager } from '@/workflows/workflowHistory/workflowHistoryManager.ee';
import { RedisService } from '@/services/redis.service';
import { RedisServicePubSubPublisher } from '@/services/redis/RedisServicePubSubPublisher';
import { RedisServicePubSubSubscriber } from '@/services/redis/RedisServicePubSubSubscriber';
import { OrchestrationHandlerMainService } from '@/services/orchestration/main/orchestration.handler.main.service';

import { mockInstance } from '../../shared/mocking';

const oclifConfig: Config.IConfig = new Config.Config({ root: __dirname });

let multiMainSetup: MultiMainSetup;

beforeAll(() => {
	mockInstance(DataSource);
	mockInstance(ExternalSecretsManager);
	mockInstance(ActiveWorkflowRunner);
	mockInstance(WorkflowHistoryManager);
	mockInstance(RedisService);
	mockInstance(RedisServicePubSubPublisher);
	mockInstance(RedisServicePubSubSubscriber);
	multiMainSetup = mockInstance(MultiMainSetup, { isEnabled: false });
	mockInstance(OrchestrationHandlerMainService);
});

afterEach(() => {
	config.load(config.default);
	jest.restoreAllMocks();
});

test('should not init license if instance is follower in multi-main scenario', async () => {
	config.set('executions.mode', 'queue');
	config.set('multiMainSetup.enabled', true);
	config.set('multiMainSetup.instanceType', 'follower');
	config.set('endpoints.disableUi', true);

	jest.spyOn(BaseCommand.prototype, 'init').mockImplementation(async () => {});

	const licenseMock = mockInstance(License, {
		isMultipleMainInstancesLicensed: jest.fn().mockReturnValue(true),
	});

	const startCmd = new Start([], oclifConfig);

	await startCmd.init();

	expect(licenseMock.init).not.toHaveBeenCalled();
});
