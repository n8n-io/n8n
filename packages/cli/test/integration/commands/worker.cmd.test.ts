process.argv[2] = 'worker';

import { mockInstance } from '@n8n/backend-test-utils';
import { ExecutionsConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { BinaryDataService } from 'n8n-core';

import { Worker } from '@/commands/worker.js';
import config from '@/config/index.js';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus.js';
import { LogStreamingEventRelay } from '@/events/relays/log-streaming.event-relay.js';
import { ExternalHooks } from '@/external-hooks.js';
import { License } from '@/license.js';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials.js';
import { CommunityPackagesService } from '@/modules/community-packages/community-packages.service.js';
import { Push } from '@/push/index.js';
import { Publisher } from '@/scaling/pubsub/publisher.service.js';
import { Subscriber } from '@/scaling/pubsub/subscriber.service.js';
import { ScalingService } from '@/scaling/scaling.service.js';
import { TaskBrokerServer } from '@/task-runners/task-broker/task-broker-server.js';
import { JsTaskRunnerProcess } from '@/task-runners/task-runner-process-js.js';
import { PyTaskRunnerProcess } from '@/task-runners/task-runner-process-py.js';
import { Telemetry } from '@/telemetry/index.js';
import { setupTestCommand } from '@test-integration/utils/test-command.js';

Container.get(ExecutionsConfig).mode = 'queue';
config.set('binaryDataManager.availableModes', 'filesystem');
mockInstance(LoadNodesAndCredentials);
const binaryDataService = mockInstance(BinaryDataService);
const communityPackagesService = mockInstance(CommunityPackagesService);
const externalHooks = mockInstance(ExternalHooks);
const license = mockInstance(License, { loadCertStr: async () => '' });
const messageEventBus = mockInstance(MessageEventBus);
const logStreamingEventRelay = mockInstance(LogStreamingEventRelay);
const scalingService = mockInstance(ScalingService);
const taskBrokerServer = mockInstance(TaskBrokerServer);
const taskRunnerProcess = mockInstance(JsTaskRunnerProcess);
mockInstance(PyTaskRunnerProcess);
mockInstance(Publisher);
mockInstance(Subscriber);
mockInstance(Telemetry);
mockInstance(Push);

const command = setupTestCommand(Worker);

test('worker initializes all its components', async () => {
	Container.get(ExecutionsConfig).mode = 'regular'; // should be overridden

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

	expect(Container.get(ExecutionsConfig).mode).toBe('queue');
});
