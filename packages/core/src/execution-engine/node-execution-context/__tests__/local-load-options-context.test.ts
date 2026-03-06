import { mock } from 'jest-mock-extended';
import type {
	INode,
	INodeTypes,
	IWorkflowBase,
	IWorkflowExecuteAdditionalData,
	IWorkflowLoader,
} from 'n8n-workflow';
import { ApplicationError, Workflow } from 'n8n-workflow';

import { LocalLoadOptionsContext } from '../local-load-options-context';
import { LoadWorkflowNodeContext } from '../workflow-node-context';

jest.mock('n8n-workflow', () => ({
	...jest.requireActual('n8n-workflow'),
	Workflow: jest.fn(),
}));

describe('LocalLoadOptionsContext', () => {
	const nodeTypes = mock<INodeTypes>();
	const additionalData = mock<IWorkflowExecuteAdditionalData>();
	const workflowLoader = mock<IWorkflowLoader>();
	const path = '';

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getWorkflowNodeContext', () => {
		const targetNodeType = 'n8n-nodes-base.executeWorkflowTrigger';

		it('should throw TypeError when workflowId parameter is missing', async () => {
			additionalData.currentNodeParameters = {};

			const context = new LocalLoadOptionsContext(nodeTypes, additionalData, path, workflowLoader);

			await expect(context.getWorkflowNodeContext(targetNodeType)).rejects.toThrow(TypeError);
		});

		it('should throw ApplicationError when workflowId value is not a string', async () => {
			additionalData.currentNodeParameters = {
				workflowId: { value: 123 },
			};

			const context = new LocalLoadOptionsContext(nodeTypes, additionalData, path, workflowLoader);

			await expect(context.getWorkflowNodeContext(targetNodeType)).rejects.toThrow(
				ApplicationError,
			);
		});

		it('should throw ApplicationError when workflowId value is empty', async () => {
			additionalData.currentNodeParameters = {
				workflowId: { value: '' },
			};

			const context = new LocalLoadOptionsContext(nodeTypes, additionalData, path, workflowLoader);

			await expect(context.getWorkflowNodeContext(targetNodeType)).rejects.toThrow(
				ApplicationError,
			);
		});

		it('should throw ApplicationError when useActiveVersion is true but no activeVersion exists', async () => {
			const workflowId = 'workflow-123';
			additionalData.currentNodeParameters = {
				workflowId: { value: workflowId },
			};

			const dbWorkflow = mock<IWorkflowBase>({
				id: workflowId,
				name: 'Test Workflow',
				nodes: [],
				activeVersion: null,
			});
			workflowLoader.get.mockResolvedValue(dbWorkflow);

			const context = new LocalLoadOptionsContext(nodeTypes, additionalData, path, workflowLoader);

			await expect(context.getWorkflowNodeContext(targetNodeType, true)).rejects.toThrow(
				ApplicationError,
			);
			await expect(context.getWorkflowNodeContext(targetNodeType, true)).rejects.toThrow(
				`No active version found for workflow "${workflowId}"!`,
			);
		});

		it('should return null when no node of the specified type exists in the workflow', async () => {
			const workflowId = 'workflow-123';
			additionalData.currentNodeParameters = {
				workflowId: { value: workflowId },
			};

			const otherNode = mock<INode>({
				type: 'n8n-nodes-base.otherNode',
				name: 'Other Node',
			});
			const dbWorkflow = mock<IWorkflowBase>({
				id: workflowId,
				name: 'Test Workflow',
				nodes: [otherNode],
			});
			workflowLoader.get.mockResolvedValue(dbWorkflow);

			const context = new LocalLoadOptionsContext(nodeTypes, additionalData, path, workflowLoader);

			const result = await context.getWorkflowNodeContext(targetNodeType);

			expect(result).toBeNull();
		});

		it('should return LoadWorkflowNodeContext when node type exists in the workflow', async () => {
			const workflowId = 'workflow-123';
			const nodeParameters = { inputSource: 'passthrough' };
			additionalData.currentNodeParameters = {
				workflowId: { value: workflowId },
			};

			const targetNode = mock<INode>({
				type: targetNodeType,
				name: 'Execute Workflow Trigger',
				parameters: nodeParameters,
			});
			const dbWorkflow = mock<IWorkflowBase>({
				id: workflowId,
				name: 'Test Workflow',
				nodes: [targetNode],
			});
			workflowLoader.get.mockResolvedValue(dbWorkflow);

			const context = new LocalLoadOptionsContext(nodeTypes, additionalData, path, workflowLoader);

			const result = await context.getWorkflowNodeContext(targetNodeType);

			expect(result).toBeInstanceOf(LoadWorkflowNodeContext);
			expect(Workflow).toHaveBeenCalledWith({
				id: workflowId,
				name: 'Test Workflow',
				nodes: [targetNode],
				connections: {},
				active: false,
				nodeTypes,
			});
		});

		it('should use activeVersion nodes when useActiveVersion is true', async () => {
			const workflowId = 'workflow-123';
			const nodeParameters = { inputSource: 'passthrough' };
			additionalData.currentNodeParameters = {
				workflowId: { value: workflowId },
			};

			const regularNode = mock<INode>({
				type: targetNodeType,
				name: 'Regular Trigger',
			});
			const activeVersionNode = mock<INode>({
				type: targetNodeType,
				name: 'Active Version Trigger',
				parameters: nodeParameters,
			});
			const dbWorkflow = mock<IWorkflowBase>({
				id: workflowId,
				name: 'Test Workflow',
				nodes: [regularNode],
				activeVersion: {
					versionId: 'version-1',
					workflowId,
					nodes: [activeVersionNode],
					connections: {},
					authors: 'test',
					name: 'Test Workflow',
					description: null,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			});
			workflowLoader.get.mockResolvedValue(dbWorkflow);

			const context = new LocalLoadOptionsContext(nodeTypes, additionalData, path, workflowLoader);

			const result = await context.getWorkflowNodeContext(targetNodeType, true);

			expect(result).toBeInstanceOf(LoadWorkflowNodeContext);
			expect(Workflow).toHaveBeenCalledWith({
				id: workflowId,
				name: 'Test Workflow',
				nodes: [activeVersionNode],
				connections: {},
				active: false,
				nodeTypes,
			});
		});

		it('should return null when node type does not exist in activeVersion nodes', async () => {
			const workflowId = 'workflow-123';
			additionalData.currentNodeParameters = {
				workflowId: { value: workflowId },
			};

			const regularNode = mock<INode>({
				type: targetNodeType,
				name: 'Regular Trigger',
			});
			const activeVersionNode = mock<INode>({
				type: 'n8n-nodes-base.otherNode',
				name: 'Other Node',
			});
			const dbWorkflow = mock<IWorkflowBase>({
				id: workflowId,
				name: 'Test Workflow',
				nodes: [regularNode],
				activeVersion: {
					versionId: 'version-1',
					workflowId,
					nodes: [activeVersionNode],
					connections: {},
					authors: 'test',
					name: 'Test Workflow',
					description: null,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			});
			workflowLoader.get.mockResolvedValue(dbWorkflow);

			const context = new LocalLoadOptionsContext(nodeTypes, additionalData, path, workflowLoader);

			const result = await context.getWorkflowNodeContext(targetNodeType, true);

			expect(result).toBeNull();
		});
	});

	describe('getCurrentNodeParameter', () => {
		it('should return the parameter value when it exists', () => {
			additionalData.currentNodeParameters = {
				testParam: 'testValue',
			};

			const context = new LocalLoadOptionsContext(nodeTypes, additionalData, path, workflowLoader);

			const result = context.getCurrentNodeParameter('testParam');

			expect(result).toBe('testValue');
		});

		it('should return undefined when parameter does not exist', () => {
			additionalData.currentNodeParameters = {};

			const context = new LocalLoadOptionsContext(nodeTypes, additionalData, path, workflowLoader);

			const result = context.getCurrentNodeParameter('nonExistent');

			expect(result).toBeUndefined();
		});

		it('should resolve nested parameter paths', () => {
			additionalData.currentNodeParameters = {
				parent: {
					child: 'nestedValue',
				},
			};

			const context = new LocalLoadOptionsContext(nodeTypes, additionalData, path, workflowLoader);

			const result = context.getCurrentNodeParameter('parent.child');

			expect(result).toBe('nestedValue');
		});
	});
});
