import { BinaryDataService } from 'n8n-core';

import { Worker } from '@/commands/worker';
import config from '@/config';
import { ExternalSecretsManager } from '@/ExternalSecrets/ExternalSecretsManager.ee';
import { MessageEventBus } from '@/eventbus/MessageEventBus/MessageEventBus';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { InternalHooks } from '@/InternalHooks';
import { OrchestrationHandlerWorkerService } from '@/services/orchestration/worker/orchestration.handler.worker.service';
import { OrchestrationWorkerService } from '@/services/orchestration/worker/orchestration.worker.service';
import { License } from '@/License';
import { ExternalHooks } from '@/ExternalHooks';
import { ScalingService } from '@/scaling/scaling.service';

import { setupTestCommand } from '@test-integration/utils/testCommand';
import { mockInstance } from '../../shared/mocking';
import { LogStreamingEventRelay } from '@/events/log-streaming-event-relay';

config.set('executions.mode', 'queue');
config.set('binaryDataManager.availableModes', 'filesystem');
mockInstance(InternalHooks);
mockInstance(LoadNodesAndCredentials);
const binaryDataService = mockInstance(BinaryDataService);
const externalHooks = mockInstance(ExternalHooks);
const externalSecretsManager = mockInstance(ExternalSecretsManager);
const license = mockInstance(License);
const messageEventBus = mockInstance(MessageEventBus);
const logStreamingEventRelay = mockInstance(LogStreamingEventRelay);
const orchestrationHandlerWorkerService = mockInstance(OrchestrationHandlerWorkerService);
const scalingService = mockInstance(ScalingService);
const orchestrationWorkerService = mockInstance(OrchestrationWorkerService);
const command = setupTestCommand(Worker);

test('worker initializes all its components', async () => {
	const worker = await command.run();

	expect(worker.queueModeId).toBeDefined();
	expect(worker.queueModeId).toContain('worker');
	expect(worker.queueModeId.length).toBeGreaterThan(15);
	expect(license.init).toHaveBeenCalledTimes(1);
	expect(binaryDataService.init).toHaveBeenCalledTimes(1);
	expect(externalHooks.init).toHaveBeenCalledTimes(1);
	expect(externalSecretsManager.init).toHaveBeenCalledTimes(1);
	expect(messageEventBus.initialize).toHaveBeenCalledTimes(1);
	expect(scalingService.setupQueue).toHaveBeenCalledTimes(1);
	expect(scalingService.setupWorker).toHaveBeenCalledTimes(1);
	expect(logStreamingEventRelay.init).toHaveBeenCalledTimes(1);
	expect(orchestrationWorkerService.init).toHaveBeenCalledTimes(1);
	expect(orchestrationHandlerWorkerService.initWithOptions).toHaveBeenCalledTimes(1);
	expect(messageEventBus.send).toHaveBeenCalledTimes(1);
});
