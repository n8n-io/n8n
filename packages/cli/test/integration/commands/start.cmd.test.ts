import * as Config from '@oclif/config';

import { mockInstance } from '../shared/utils';

import { Start } from '@/commands/start';
import { BaseCommand } from '@/commands/BaseCommand';
import config from '@/config';
import { License } from '@/License';

import { ExternalSecretsManager } from '@/ExternalSecrets/ExternalSecretsManager.ee';
import { MultiMainInstancePublisher } from '@/services/orchestration/main/MultiMainInstance.publisher.ee';
import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import { WorkflowHistoryManager } from '@/workflows/workflowHistory/workflowHistoryManager.ee';
import { RedisService } from '@/services/redis.service';
import { RedisServicePubSubPublisher } from '@/services/redis/RedisServicePubSubPublisher';
import { RedisServicePubSubSubscriber } from '@/services/redis/RedisServicePubSubSubscriber';
import { OrchestrationHandlerMainService } from '@/services/orchestration/main/orchestration.handler.main.service';

const oclifConfig: Config.IConfig = new Config.Config({ root: __dirname });

beforeAll(() => {
	mockInstance(ExternalSecretsManager);
	mockInstance(ActiveWorkflowRunner);
	mockInstance(WorkflowHistoryManager);
	mockInstance(RedisService);
	mockInstance(RedisServicePubSubPublisher);
	mockInstance(RedisServicePubSubSubscriber);
	mockInstance(MultiMainInstancePublisher);
	mockInstance(OrchestrationHandlerMainService);
});

afterEach(() => {
	config.load(config.default);
	jest.restoreAllMocks();
});

test('should not init license if instance is follower in multi-main scenario', async () => {
	config.set('executions.mode', 'queue');
	config.set('endpoints.disableUi', true);
	config.set('leaderSelection.enabled', true);

	jest.spyOn(MultiMainInstancePublisher.prototype, 'isFollower', 'get').mockReturnValue(true);
	jest.spyOn(BaseCommand.prototype, 'init').mockImplementation(async () => {});

	const licenseMock = mockInstance(License, {
		isMultipleMainInstancesLicensed: jest.fn().mockReturnValue(true),
	});

	const startCmd = new Start([], oclifConfig);

	await startCmd.init();

	expect(licenseMock.init).not.toHaveBeenCalled();
});
