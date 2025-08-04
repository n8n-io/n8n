'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
process.argv[2] = 'worker';
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const config_1 = require('@n8n/config');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const worker_1 = require('@/commands/worker');
const config_2 = __importDefault(require('@/config'));
const message_event_bus_1 = require('@/eventbus/message-event-bus/message-event-bus');
const log_streaming_event_relay_1 = require('@/events/relays/log-streaming.event-relay');
const external_hooks_1 = require('@/external-hooks');
const license_1 = require('@/license');
const load_nodes_and_credentials_1 = require('@/load-nodes-and-credentials');
const push_1 = require('@/push');
const publisher_service_1 = require('@/scaling/pubsub/publisher.service');
const subscriber_service_1 = require('@/scaling/pubsub/subscriber.service');
const scaling_service_1 = require('@/scaling/scaling.service');
const community_packages_service_1 = require('@/community-packages/community-packages.service');
const task_broker_server_1 = require('@/task-runners/task-broker/task-broker-server');
const task_runner_process_1 = require('@/task-runners/task-runner-process');
const telemetry_1 = require('@/telemetry');
const test_command_1 = require('@test-integration/utils/test-command');
config_2.default.set('executions.mode', 'queue');
config_2.default.set('binaryDataManager.availableModes', 'filesystem');
di_1.Container.get(config_1.TaskRunnersConfig).enabled = true;
(0, backend_test_utils_1.mockInstance)(load_nodes_and_credentials_1.LoadNodesAndCredentials);
const binaryDataService = (0, backend_test_utils_1.mockInstance)(n8n_core_1.BinaryDataService);
const communityPackagesService = (0, backend_test_utils_1.mockInstance)(
	community_packages_service_1.CommunityPackagesService,
);
const externalHooks = (0, backend_test_utils_1.mockInstance)(external_hooks_1.ExternalHooks);
const license = (0, backend_test_utils_1.mockInstance)(license_1.License, {
	loadCertStr: async () => '',
});
const messageEventBus = (0, backend_test_utils_1.mockInstance)(message_event_bus_1.MessageEventBus);
const logStreamingEventRelay = (0, backend_test_utils_1.mockInstance)(
	log_streaming_event_relay_1.LogStreamingEventRelay,
);
const scalingService = (0, backend_test_utils_1.mockInstance)(scaling_service_1.ScalingService);
const taskBrokerServer = (0, backend_test_utils_1.mockInstance)(
	task_broker_server_1.TaskBrokerServer,
);
const taskRunnerProcess = (0, backend_test_utils_1.mockInstance)(
	task_runner_process_1.TaskRunnerProcess,
);
(0, backend_test_utils_1.mockInstance)(publisher_service_1.Publisher);
(0, backend_test_utils_1.mockInstance)(subscriber_service_1.Subscriber);
(0, backend_test_utils_1.mockInstance)(telemetry_1.Telemetry);
(0, backend_test_utils_1.mockInstance)(push_1.Push);
const command = (0, test_command_1.setupTestCommand)(worker_1.Worker);
test('worker initializes all its components', async () => {
	config_2.default.set('executions.mode', 'regular');
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
	expect(config_2.default.getEnv('executions.mode')).toBe('queue');
});
//# sourceMappingURL=worker.cmd.test.js.map
