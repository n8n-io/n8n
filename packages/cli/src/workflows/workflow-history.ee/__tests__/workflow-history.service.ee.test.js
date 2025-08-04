'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const jest_mock_extended_1 = require('jest-mock-extended');
const workflow_finder_service_1 = require('@/workflows/workflow-finder.service');
const workflow_history_service_ee_1 = require('@/workflows/workflow-history.ee/workflow-history.service.ee');
const workflow_1 = require('@test-integration/workflow');
const workflowHistoryRepository = (0, backend_test_utils_1.mockInstance)(
	db_1.WorkflowHistoryRepository,
);
const logger = (0, backend_test_utils_1.mockLogger)();
const workflowFinderService = (0, backend_test_utils_1.mockInstance)(
	workflow_finder_service_1.WorkflowFinderService,
);
const workflowHistoryService = new workflow_history_service_ee_1.WorkflowHistoryService(
	logger,
	workflowHistoryRepository,
	workflowFinderService,
);
const testUser = Object.assign(new db_1.User(), {
	id: '1234',
	password: 'passwordHash',
	mfaEnabled: false,
	firstName: 'John',
	lastName: 'Doe',
});
let isWorkflowHistoryEnabled = true;
jest.mock('@/workflows/workflow-history.ee/workflow-history-helper.ee', () => {
	return {
		isWorkflowHistoryEnabled: jest.fn(() => isWorkflowHistoryEnabled),
	};
});
describe('WorkflowHistoryService', () => {
	beforeEach(() => {
		(0, jest_mock_extended_1.mockClear)(workflowHistoryRepository.insert);
	});
	describe('saveVersion', () => {
		it('should save a new version when workflow history is enabled and nodes and connections are present', async () => {
			isWorkflowHistoryEnabled = true;
			const workflow = (0, workflow_1.getWorkflow)({ addNodeWithoutCreds: true });
			const workflowId = '123';
			workflow.connections = {};
			workflow.id = workflowId;
			workflow.versionId = '456';
			await workflowHistoryService.saveVersion(testUser, workflow, workflowId);
			expect(workflowHistoryRepository.insert).toHaveBeenCalledWith({
				authors: 'John Doe',
				connections: {},
				nodes: workflow.nodes,
				versionId: workflow.versionId,
				workflowId,
			});
		});
		it('should not save a new version when workflow history is disabled', async () => {
			isWorkflowHistoryEnabled = false;
			const workflow = (0, workflow_1.getWorkflow)({ addNodeWithoutCreds: true });
			const workflowId = '123';
			workflow.connections = {};
			workflow.id = workflowId;
			workflow.versionId = '456';
			await workflowHistoryService.saveVersion(testUser, workflow, workflowId);
			expect(workflowHistoryRepository.insert).not.toHaveBeenCalled();
		});
		it('should not save a new version when nodes or connections are missing', async () => {
			isWorkflowHistoryEnabled = true;
			const workflow = (0, workflow_1.getWorkflow)({ addNodeWithoutCreds: true });
			const workflowId = '123';
			workflow.id = workflowId;
			workflow.versionId = '456';
			await workflowHistoryService.saveVersion(testUser, workflow, workflowId);
			expect(workflowHistoryRepository.insert).not.toHaveBeenCalled();
		});
		it('should log an error when failed to save workflow history version', async () => {
			isWorkflowHistoryEnabled = true;
			const workflow = (0, workflow_1.getWorkflow)({ addNodeWithoutCreds: true });
			const workflowId = '123';
			workflow.connections = {};
			workflow.id = workflowId;
			workflow.versionId = '456';
			workflowHistoryRepository.insert.mockRejectedValueOnce(new Error('Test error'));
			await workflowHistoryService.saveVersion(testUser, workflow, workflowId);
			expect(workflowHistoryRepository.insert).toHaveBeenCalled();
		});
	});
});
//# sourceMappingURL=workflow-history.service.ee.test.js.map
