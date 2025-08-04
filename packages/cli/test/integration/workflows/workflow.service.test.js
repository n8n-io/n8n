'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const active_workflow_manager_1 = require('@/active-workflow-manager');
const message_event_bus_1 = require('@/eventbus/message-event-bus/message-event-bus');
const telemetry_1 = require('@/telemetry');
const workflow_finder_service_1 = require('@/workflows/workflow-finder.service');
const workflow_service_1 = require('@/workflows/workflow.service');
const users_1 = require('../shared/db/users');
let workflowService;
const activeWorkflowManager = (0, backend_test_utils_1.mockInstance)(
	active_workflow_manager_1.ActiveWorkflowManager,
);
(0, backend_test_utils_1.mockInstance)(message_event_bus_1.MessageEventBus);
(0, backend_test_utils_1.mockInstance)(telemetry_1.Telemetry);
beforeAll(async () => {
	await backend_test_utils_1.testDb.init();
	workflowService = new workflow_service_1.WorkflowService(
		(0, jest_mock_extended_1.mock)(),
		di_1.Container.get(db_1.SharedWorkflowRepository),
		di_1.Container.get(db_1.WorkflowRepository),
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		activeWorkflowManager,
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		di_1.Container.get(workflow_finder_service_1.WorkflowFinderService),
	);
});
afterEach(async () => {
	await backend_test_utils_1.testDb.truncate(['WorkflowEntity']);
	jest.restoreAllMocks();
});
describe('update()', () => {
	test('should remove and re-add to active workflows on `active: true` payload', async () => {
		const owner = await (0, users_1.createOwner)();
		const workflow = await (0, backend_test_utils_1.createWorkflow)({ active: true }, owner);
		const removeSpy = jest.spyOn(activeWorkflowManager, 'remove');
		const addSpy = jest.spyOn(activeWorkflowManager, 'add');
		await workflowService.update(owner, workflow, workflow.id);
		expect(removeSpy).toHaveBeenCalledTimes(1);
		const [removedWorkflowId] = removeSpy.mock.calls[0];
		expect(removedWorkflowId).toBe(workflow.id);
		expect(addSpy).toHaveBeenCalledTimes(1);
		const [addedWorkflowId, activationMode] = addSpy.mock.calls[0];
		expect(addedWorkflowId).toBe(workflow.id);
		expect(activationMode).toBe('update');
	});
	test('should remove from active workflows on `active: false` payload', async () => {
		const owner = await (0, users_1.createOwner)();
		const workflow = await (0, backend_test_utils_1.createWorkflow)({ active: true }, owner);
		const removeSpy = jest.spyOn(activeWorkflowManager, 'remove');
		const addSpy = jest.spyOn(activeWorkflowManager, 'add');
		workflow.active = false;
		await workflowService.update(owner, workflow, workflow.id);
		expect(removeSpy).toHaveBeenCalledTimes(1);
		const [removedWorkflowId] = removeSpy.mock.calls[0];
		expect(removedWorkflowId).toBe(workflow.id);
		expect(addSpy).not.toHaveBeenCalled();
	});
});
//# sourceMappingURL=workflow.service.test.js.map
