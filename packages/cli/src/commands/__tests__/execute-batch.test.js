'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const active_executions_1 = require('@/active-executions');
const community_packages_service_1 = require('@/community-packages/community-packages.service');
const deprecation_service_1 = require('@/deprecation/deprecation.service');
const message_event_bus_1 = require('@/eventbus/message-event-bus/message-event-bus');
const telemetry_event_relay_1 = require('@/events/relays/telemetry.event-relay');
const external_hooks_1 = require('@/external-hooks');
const load_nodes_and_credentials_1 = require('@/load-nodes-and-credentials');
const posthog_1 = require('@/posthog');
const ownership_service_1 = require('@/services/ownership.service');
const shutdown_service_1 = require('@/shutdown/shutdown.service');
const task_runner_module_1 = require('@/task-runners/task-runner-module');
const workflow_runner_1 = require('@/workflow-runner');
const execute_batch_1 = require('../execute-batch');
const taskRunnerModule = (0, backend_test_utils_1.mockInstance)(
	task_runner_module_1.TaskRunnerModule,
);
const workflowRepository = (0, backend_test_utils_1.mockInstance)(db_1.WorkflowRepository);
const ownershipService = (0, backend_test_utils_1.mockInstance)(
	ownership_service_1.OwnershipService,
);
const workflowRunner = (0, backend_test_utils_1.mockInstance)(workflow_runner_1.WorkflowRunner);
const activeExecutions = (0, backend_test_utils_1.mockInstance)(
	active_executions_1.ActiveExecutions,
);
const loadNodesAndCredentials = (0, backend_test_utils_1.mockInstance)(
	load_nodes_and_credentials_1.LoadNodesAndCredentials,
);
const shutdownService = (0, backend_test_utils_1.mockInstance)(shutdown_service_1.ShutdownService);
const deprecationService = (0, backend_test_utils_1.mockInstance)(
	deprecation_service_1.DeprecationService,
);
(0, backend_test_utils_1.mockInstance)(message_event_bus_1.MessageEventBus);
const posthogClient = (0, backend_test_utils_1.mockInstance)(posthog_1.PostHogClient);
const telemetryEventRelay = (0, backend_test_utils_1.mockInstance)(
	telemetry_event_relay_1.TelemetryEventRelay,
);
const externalHooks = (0, backend_test_utils_1.mockInstance)(external_hooks_1.ExternalHooks);
(0, backend_test_utils_1.mockInstance)(community_packages_service_1.CommunityPackagesService);
const dbConnection = (0, backend_test_utils_1.mockInstance)(db_1.DbConnection);
dbConnection.init.mockResolvedValue(undefined);
dbConnection.migrate.mockResolvedValue(undefined);
test('should start a task runner when task runners are enabled', async () => {
	const workflow = (0, jest_mock_extended_1.mock)({
		id: '123',
		nodes: [{ type: 'n8n-nodes-base.manualTrigger' }],
	});
	const run = (0, jest_mock_extended_1.mock)({ data: { resultData: { error: undefined } } });
	const queryBuilder = (0, jest_mock_extended_1.mock)({
		andWhere: jest.fn().mockReturnThis(),
		getMany: jest.fn().mockResolvedValue([workflow]),
	});
	loadNodesAndCredentials.init.mockResolvedValue(undefined);
	shutdownService.shutdown.mockReturnValue();
	deprecationService.warn.mockReturnValue();
	posthogClient.init.mockResolvedValue();
	telemetryEventRelay.init.mockResolvedValue();
	externalHooks.init.mockResolvedValue();
	workflowRepository.createQueryBuilder.mockReturnValue(queryBuilder);
	ownershipService.getInstanceOwner.mockResolvedValue(
		(0, jest_mock_extended_1.mock)({ id: '123' }),
	);
	workflowRunner.run.mockResolvedValue('123');
	activeExecutions.getPostExecutePromise.mockResolvedValue(run);
	di_1.Container.set(
		config_1.GlobalConfig,
		(0, jest_mock_extended_1.mock)({
			taskRunners: { enabled: true },
			nodes: {},
		}),
	);
	const cmd = new execute_batch_1.ExecuteBatch();
	cmd.flags = {};
	cmd.runTests = jest.fn().mockResolvedValue({ summary: { failedExecutions: [] } });
	await cmd.init();
	await cmd.run();
	expect(taskRunnerModule.start).toHaveBeenCalledTimes(1);
});
//# sourceMappingURL=execute-batch.test.js.map
