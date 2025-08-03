process.argv[2] = 'worker';

import { mockInstance } from '@n8n/backend-test-utils';
import { TaskRunnersConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { BinaryDataService } from 'n8n-core';

import { Worker } from '@/commands/worker';
import config from '@/config';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { LogStreamingEventRelay } from '@/events/relays/log-streaming.event-relay';
import { ExternalHooks } from '@/external-hooks';
import { License } from '@/license';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { Push } from '@/push';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { Subscriber } from '@/scaling/pubsub/subscriber.service';
import { ScalingService } from '@/scaling/scaling.service';
import { CommunityPackagesService } from '@/community-packages/community-packages.service';
import { TaskBrokerServer } from '@/task-runners/task-broker/task-broker-server';
import { TaskRunnerProcess } from '@/task-runners/task-runner-process';
import { Telemetry } from '@/telemetry';
import { setupTestCommand } from '@test-integration/utils/test-command';

config.set('executions.mode', 'queue');
config.set('binaryDataManager.availableModes', 'filesystem');
Container.get(TaskRunnersConfig).enabled = true;
mockInstance(LoadNodesAndCredentials);
const binaryDataService = mockInstance(BinaryDataService);
const communityPackagesService = mockInstance(CommunityPackagesService);
const externalHooks = mockInstance(ExternalHooks);
const license = mockInstance(License, { loadCertStr: async () => '' });
const messageEventBus = mockInstance(MessageEventBus);
const logStreamingEventRelay = mockInstance(LogStreamingEventRelay);
const scalingService = mockInstance(ScalingService);
const taskBrokerServer = mockInstance(TaskBrokerServer);
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
	expect(communityPackagesService.init).toHaveBeenCalledTimes(1);
	expect(externalHooks.init).toHaveBeenCalledTimes(1);
	expect(messageEventBus.initialize).toHaveBeenCalledTimes(1);
	expect(scalingService.setupQueue).toHaveBeenCalledTimes(1);
	expect(scalingService.setupWorker).toHaveBeenCalledTimes(1);
	expect(logStreamingEventRelay.init).toHaveBeenCalledTimes(1);
	expect(messageEventBus.send).toHaveBeenCalledTimes(1);
	expect(taskBrokerServer.start).toHaveBeenCalledTimes(1);
	expect(taskRunnerProcess.start).toHaveBeenCalledTimes(1);

	expect(config.getEnv('executions.mode')).toBe('queue');
});
