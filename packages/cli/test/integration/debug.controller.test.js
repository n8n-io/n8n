'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const active_workflow_manager_1 = require('@/active-workflow-manager');
const multi_main_setup_ee_1 = require('@/scaling/multi-main-setup.ee');
const users_1 = require('./shared/db/users');
const utils_1 = require('./shared/utils');
describe('DebugController', () => {
	const workflowRepository = (0, backend_test_utils_1.mockInstance)(db_1.WorkflowRepository);
	const activeWorkflowManager = (0, backend_test_utils_1.mockInstance)(
		active_workflow_manager_1.ActiveWorkflowManager,
	);
	const instanceSettings = di_1.Container.get(n8n_core_1.InstanceSettings);
	instanceSettings.markAsLeader();
	const testServer = (0, utils_1.setupTestServer)({ endpointGroups: ['debug'] });
	let ownerAgent;
	beforeAll(async () => {
		const owner = await (0, users_1.createOwner)();
		ownerAgent = testServer.authAgentFor(owner);
		testServer.license.enable('feat:multipleMainInstances');
	});
	describe('GET /debug/multi-main-setup', () => {
		test('should return multi-main setup details', async () => {
			const workflowId = (0, db_1.generateNanoId)();
			const webhooks = [{ id: workflowId, name: (0, backend_test_utils_1.randomName)() }];
			const triggersAndPollers = [{ id: workflowId, name: (0, backend_test_utils_1.randomName)() }];
			const activationErrors = { [workflowId]: 'Failed to activate' };
			const { instanceId } = instanceSettings;
			const leaderKey = 'some-leader-key';
			workflowRepository.findIn.mockResolvedValue(triggersAndPollers);
			workflowRepository.findWebhookBasedActiveWorkflows.mockResolvedValue(webhooks);
			activeWorkflowManager.allActiveInMemory.mockReturnValue([workflowId]);
			activeWorkflowManager.getAllWorkflowActivationErrors.mockResolvedValue(activationErrors);
			jest
				.spyOn(multi_main_setup_ee_1.MultiMainSetup.prototype, 'fetchLeaderKey')
				.mockResolvedValue(leaderKey);
			const response = await ownerAgent.get('/debug/multi-main-setup').expect(200);
			expect(response.body.data).toMatchObject({
				instanceId,
				leaderKey,
				isLeader: true,
				activeWorkflows: {
					webhooks,
					triggersAndPollers,
				},
				activationErrors,
			});
		});
	});
});
//# sourceMappingURL=debug.controller.test.js.map
