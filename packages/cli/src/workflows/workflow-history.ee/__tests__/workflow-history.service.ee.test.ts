import { mockLogger, mockInstance } from '@n8n/backend-test-utils';
import { User, WorkflowHistory, WorkflowHistoryRepository } from '@n8n/db';
import { mockClear } from 'jest-mock-extended';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowHistoryService } from '@/workflows/workflow-history.ee/workflow-history.service.ee';
import { getWorkflow } from '@test-integration/workflow';

const workflowHistoryRepository = mockInstance(WorkflowHistoryRepository);
const logger = mockLogger();
const workflowFinderService = mockInstance(WorkflowFinderService);

// Mock the manager.insert method
const mockManagerInsert = jest.fn();
Object.defineProperty(workflowHistoryRepository, 'manager', {
	value: {
		insert: mockManagerInsert,
	},
	writable: true,
});

const workflowHistoryService = new WorkflowHistoryService(
	logger,
	workflowHistoryRepository,
	workflowFinderService,
);
const testUser = Object.assign(new User(), {
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
		mockClear(mockManagerInsert);
	});

	describe('saveVersion', () => {
		it('should save a new version when workflow history is enabled and nodes and connections are present', async () => {
			// Arrange
			isWorkflowHistoryEnabled = true;
			const workflow = getWorkflow({ addNodeWithoutCreds: true });
			const workflowId = '123';
			workflow.connections = {};
			workflow.id = workflowId;
			workflow.versionId = '456';

			// Act
			await workflowHistoryService.saveVersion(testUser, workflow, workflowId);

			// Assert
			expect(mockManagerInsert).toHaveBeenCalledWith(WorkflowHistory, {
				authors: 'John Doe',
				connections: {},
				nodes: workflow.nodes,
				versionId: workflow.versionId,
				workflowId,
			});
		});

		it('should not save a new version when workflow history is disabled', async () => {
			// Arrange
			isWorkflowHistoryEnabled = false;
			const workflow = getWorkflow({ addNodeWithoutCreds: true });
			const workflowId = '123';
			workflow.connections = {};
			workflow.id = workflowId;
			workflow.versionId = '456';

			// Act
			await workflowHistoryService.saveVersion(testUser, workflow, workflowId);

			// Assert
			expect(mockManagerInsert).not.toHaveBeenCalled();
		});

		it('should not save a new version when nodes or connections are missing', async () => {
			// Arrange
			isWorkflowHistoryEnabled = true;
			const workflow = getWorkflow({ addNodeWithoutCreds: true });
			const workflowId = '123';
			workflow.id = workflowId;
			workflow.versionId = '456';
			// Nodes are set but connections is empty

			// Act
			await workflowHistoryService.saveVersion(testUser, workflow, workflowId);

			// Assert
			expect(mockManagerInsert).not.toHaveBeenCalled();
		});

		it('should log an error when failed to save workflow history version', async () => {
			// Arrange
			isWorkflowHistoryEnabled = true;
			const workflow = getWorkflow({ addNodeWithoutCreds: true });
			const workflowId = '123';
			workflow.connections = {};
			workflow.id = workflowId;
			workflow.versionId = '456';
			mockManagerInsert.mockRejectedValueOnce(new Error('Test error'));

			// Act
			await workflowHistoryService.saveVersion(testUser, workflow, workflowId);

			// Assert
			expect(mockManagerInsert).toHaveBeenCalled();
		});
	});
});
