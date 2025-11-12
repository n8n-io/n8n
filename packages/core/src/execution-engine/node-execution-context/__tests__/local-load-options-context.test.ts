import { mock } from 'jest-mock-extended';
import type {
	INode,
	INodeTypes,
	IWorkflowBase,
	IWorkflowExecuteAdditionalData,
	IWorkflowLoader,
} from 'n8n-workflow';
import { EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE } from 'n8n-workflow';

import { LocalLoadOptionsContext } from '../local-load-options-context';

describe('LocalLoadOptionsContext', () => {
	let workflowLoader: jest.Mocked<IWorkflowLoader>;
	let nodeTypes: jest.Mocked<INodeTypes>;
	let additionalData: IWorkflowExecuteAdditionalData;
	let context: LocalLoadOptionsContext;

	const mockWorkflow: IWorkflowBase = {
		id: 'test-workflow-id',
		name: 'Test Workflow',
		nodes: [
			{
				id: 'trigger1',
				name: 'Trigger 1',
				type: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
				disabled: false,
			} as INode,
			{
				id: 'trigger2',
				name: 'Trigger 2',
				type: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
				typeVersion: 1,
				position: [100, 0],
				parameters: {},
				disabled: false,
			} as INode,
			{
				id: 'trigger3',
				name: 'Disabled Trigger',
				type: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
				typeVersion: 1,
				position: [200, 0],
				parameters: {},
				disabled: true,
			} as INode,
			{
				id: 'manual1',
				name: 'Manual Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [300, 0],
				parameters: {},
				disabled: false,
			} as INode,
		],
		connections: {},
		active: false,
		settings: {},
	};

	beforeEach(() => {
		workflowLoader = mock<IWorkflowLoader>();
		nodeTypes = mock<INodeTypes>();
		additionalData = mock<IWorkflowExecuteAdditionalData>({
			currentNodeParameters: {
				workflowId: { value: 'test-workflow-id' },
			},
		});

		context = new LocalLoadOptionsContext(nodeTypes, additionalData, 'workflowId', workflowLoader);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('getAllWorkflowNodes', () => {
		it('should return empty array when workflowId not found', async () => {
			additionalData.currentNodeParameters = {};

			const result = await context.getAllWorkflowNodes();

			expect(result).toEqual([]);
			expect(workflowLoader.get).not.toHaveBeenCalled();
		});

		it('should return empty array when workflowId is invalid', async () => {
			additionalData.currentNodeParameters = { workflowId: { value: '' } };

			const result = await context.getAllWorkflowNodes();

			expect(result).toEqual([]);
			expect(workflowLoader.get).not.toHaveBeenCalled();
		});

		it('should return all non-disabled nodes when no filter specified', async () => {
			workflowLoader.get.mockResolvedValue(mockWorkflow);

			const result = await context.getAllWorkflowNodes();

			expect(result).toHaveLength(3); // 3 enabled nodes
			expect(result.every((node) => !node.disabled)).toBe(true);
			expect(result.find((node) => node.name === 'Disabled Trigger')).toBeUndefined();
		});

		it('should filter by nodeType when specified', async () => {
			workflowLoader.get.mockResolvedValue(mockWorkflow);

			const result = await context.getAllWorkflowNodes(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE);

			expect(result).toHaveLength(2); // Only 2 enabled executeWorkflowTrigger nodes
			expect(result.every((node) => node.type === EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE)).toBe(true);
			expect(result.find((node) => node.name === 'Manual Trigger')).toBeUndefined();
		});

		it('should exclude disabled nodes even when filtering by type', async () => {
			workflowLoader.get.mockResolvedValue(mockWorkflow);

			const result = await context.getAllWorkflowNodes(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE);

			expect(result.find((node) => node.name === 'Disabled Trigger')).toBeUndefined();
		});

		it('should handle workflow loader errors gracefully', async () => {
			workflowLoader.get.mockRejectedValue(new Error('Database error'));

			await expect(context.getAllWorkflowNodes()).rejects.toThrow('Database error');
		});
	});

	describe('getWorkflowNodeContext', () => {
		it('should find node by type only when no nodeName specified', async () => {
			workflowLoader.get.mockResolvedValue(mockWorkflow);

			const result = await context.getWorkflowNodeContext(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE);

			expect(result).not.toBeNull();
			// Should return first matching node by type
		});

		it('should find node by type AND name when both specified', async () => {
			workflowLoader.get.mockResolvedValue(mockWorkflow);

			const result = await context.getWorkflowNodeContext(
				EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
				'Trigger 2',
			);

			expect(result).not.toBeNull();
			// Should return specifically "Trigger 2"
		});

		it('should return null when node with specified name not found', async () => {
			workflowLoader.get.mockResolvedValue(mockWorkflow);

			const result = await context.getWorkflowNodeContext(
				EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
				'Nonexistent Trigger',
			);

			expect(result).toBeNull();
		});

		it('should throw ApplicationError when workflowId missing', async () => {
			additionalData.currentNodeParameters = {};

			await expect(
				context.getWorkflowNodeContext(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE),
			).rejects.toThrow('No workflowId parameter defined');
		});

		it('should not return disabled nodes', async () => {
			workflowLoader.get.mockResolvedValue(mockWorkflow);

			const result = await context.getWorkflowNodeContext(
				EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
				'Disabled Trigger',
			);

			// Even though "Disabled Trigger" exists, it should not be returned because it's disabled
			expect(result).toBeNull();
		});
	});

	describe('getCurrentNodeParameter', () => {
		it('should return parameter value when it exists', () => {
			additionalData.currentNodeParameters = {
				testParam: 'testValue',
			};

			const result = context.getCurrentNodeParameter('testParam');

			expect(result).toBe('testValue');
		});

		it('should return nested parameter value', () => {
			additionalData.currentNodeParameters = {
				workflowId: { value: 'test-id' },
			};

			const result = context.getCurrentNodeParameter('workflowId.value');

			expect(result).toBe('test-id');
		});

		it('should return undefined when parameter does not exist', () => {
			additionalData.currentNodeParameters = {};

			const result = context.getCurrentNodeParameter('nonexistent');

			expect(result).toBeUndefined();
		});
	});
});
