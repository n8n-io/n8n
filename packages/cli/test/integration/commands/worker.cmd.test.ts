process.argv[2] = 'worker';

import { ModuleRegistry } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { ExecutionsConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { BinaryDataService, DataDeduplicationService } from 'n8n-core';

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

beforeEach(() => {
	// Each test boots the full worker command (init + run). `DataDeduplicationService`
	// is a process-wide singleton whose static `init()` asserts it has not been
	// initialized before, so the second boot in this file would throw
	// "Instance already initialized. Multiple initializations are not allowed."
	// Stub it to a no-op so every test can boot independently. This lives in
	// `beforeEach` (not at module scope) because the vi config restores mocks
	// between tests, which would otherwise revert the stub before the next boot.
	vi.spyOn(DataDeduplicationService, 'init').mockResolvedValue(undefined);
});

afterEach(() => {
	// `ModuleRegistry.context` is a shared singleton; clear it unconditionally so
	// entries set by a test (e.g. the stubbed 'data-table' below) never leak to
	// the next test, even when an assertion fails before inline cleanup would run.
	Container.get(ModuleRegistry).context.clear();
});

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

test('does not start processing queued jobs before module execution contexts are ready', async () => {
	// A job becomes runnable on a worker the instant it registers its Bull
	// processor (`setupWorker`). `getBase()` builds that job's `additionalData`
	// by copying `ModuleRegistry.context`, so a job dequeued before a module has
	// registered its context gets none of its helpers, e.g. the Data Table node
	// then fails with "module is disabled". The processor must therefore not be
	// registered until modules have initialized.
	const moduleRegistry = Container.get(ModuleRegistry);
	vi.spyOn(moduleRegistry, 'initModules').mockImplementation(async () => {
		moduleRegistry.context.set('data-table', { dataTableProxyProvider: {} } as never);
	});

	// Capture the module context at the exact moment the processor is registered.
	let moduleContextAtRegistration: string[] = [];
	scalingService.setupWorker.mockImplementation(() => {
		moduleContextAtRegistration = [...moduleRegistry.context.keys()];
	});

	await command.run();

	expect(moduleContextAtRegistration).toContain('data-table');
});
