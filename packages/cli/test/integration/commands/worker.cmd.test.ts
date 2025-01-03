process.argv[2] = 'worker';

import { TaskRunnersConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { BinaryDataService } from 'n8n-core';

import { Worker } from '@/commands/worker';
import config from '@/config';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { LogStreamingEventRelay } from '@/events/relays/log-streaming.event-relay';
import { ExternalHooks } from '@/external-hooks';
import { ExternalSecretsManager } from '@/external-secrets.ee/external-secrets-manager.ee';
import { License } from '@/license';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { Push } from '@/push';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { Subscriber } from '@/scaling/pubsub/subscriber.service';
import { ScalingService } from '@/scaling/scaling.service';
import { OrchestrationService } from '@/services/orchestration.service';
import { TaskRunnerProcess } from '@/task-runners/task-runner-process';
import { TaskRunnerServer } from '@/task-runners/task-runner-server';
import { Telemetry } from '@/telemetry';
import { setupTestCommand } from '@test-integration/utils/test-command';

import { mockInstance } from '../../shared/mocking';

config.set('executions.mode', 'queue');
config.set('binaryDataManager.availableModes', 'filesystem');
Container.get(TaskRunnersConfig).enabled = true;
mockInstance(LoadNodesAndCredentials);
const binaryDataService = mockInstance(BinaryDataService);
const externalHooks = mockInstance(ExternalHooks);
const externalSecretsManager = mockInstance(ExternalSecretsManager);
const license = mockInstance(License, { loadCertStr: async () => '' });
const messageEventBus = mockInstance(MessageEventBus);
const logStreamingEventRelay = mockInstance(LogStreamingEventRelay);
const scalingService = mockInstance(ScalingService);
const orchestrationService = mockInstance(OrchestrationService);
const taskRunnerServer = mockInstance(TaskRunnerServer);
const taskRunnerProcess = mockInstance(TaskRunnerProcess);
mockInstance(Publisher);
mockInstance(Subscriber);
mockInstance(Telemetry);
mockInstance(Push);

const command = setupTestCommand(Worker);

test('worker initializes all its components', async () => {
	config.set('executions.mode', 'regular'); // should be overridden

	await command.run();

	expect(license.init).toHaveBeenCalledTimes(1);
	expect(binaryDataService.init).toHaveBeenCalledTimes(1);
	expect(externalHooks.init).toHaveBeenCalledTimes(1);
	expect(externalSecretsManager.init).toHaveBeenCalledTimes(1);
	expect(messageEventBus.initialize).toHaveBeenCalledTimes(1);
	expect(scalingService.setupQueue).toHaveBeenCalledTimes(1);
	expect(scalingService.setupWorker).toHaveBeenCalledTimes(1);
	expect(logStreamingEventRelay.init).toHaveBeenCalledTimes(1);
	expect(orchestrationService.init).toHaveBeenCalledTimes(1);
	expect(messageEventBus.send).toHaveBeenCalledTimes(1);
	expect(taskRunnerServer.start).toHaveBeenCalledTimes(1);
	expect(taskRunnerProcess.start).toHaveBeenCalledTimes(1);

	expect(config.getEnv('executions.mode')).toBe('queue');
});
