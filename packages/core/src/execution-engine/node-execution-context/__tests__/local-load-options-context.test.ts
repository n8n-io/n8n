import type {
	INode,
	INodeTypes,
	IWorkflowBase,
	IWorkflowExecuteAdditionalData,
	IWorkflowLoader,
} from 'n8n-workflow';
import { Workflow } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { LocalLoadOptionsContext } from '../local-load-options-context';
import { LoadWorkflowNodeContext } from '../workflow-node-context';

vi.mock('n8n-workflow', async (importActual) => ({
	...(await importActual()),
	Workflow: vi.fn(),
}));

describe('LocalLoadOptionsContext', () => {
	const nodeTypes = mock<INodeTypes>();
	const additionalData = mock<IWorkflowExecuteAdditionalData>();
	const workflowLoader = mock<IWorkflowLoader>();
	const path = '';

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getWorkflowNodeContext', () => {
		const targetNodeType = 'n8n-nodes-base.executeWorkflowTrigger';

		it('should return null when workflowId parameter is missing', async () => {
			additionalData.currentNodeParameters = {};

			const context = new LocalLoadOptionsContext(nodeTypes, additionalData, path, workflowLoader);

			await expect(context.getWorkflowNodeContext(targetNodeType)).resolves.toBeNull();
		});

		it('should return null when workflowId value is not a string', async () => {
			additionalData.currentNodeParameters = {
				workflowId: { value: 123 },
			};

			const context = new LocalLoadOptionsContext(nodeTypes, additionalData, path, workflowLoader);

			await expect(context.getWorkflowNodeContext(targetNodeType)).resolves.toBeNull();
		});

		it('should return null when workflowId value is empty', async () => {
			additionalData.currentNodeParameters = {
				workflowId: { value: '' },
			};

			const context = new LocalLoadOptionsContext(nodeTypes, additionalData, path, workflowLoader);

			await expect(context.getWorkflowNodeContext(targetNodeType)).resolves.toBeNull();
		});

		it('should fall back to draft nodes when useActiveVersion is true but no activeVersion exists', async () => {
			const workflowId = 'workflow-123';
			const nodeParameters = { inputSource: 'passthrough' };
			additionalData.currentNodeParameters = {
				workflowId: { value: workflowId },
			};

			const draftNode = mock<INode>({
				type: targetNodeType,
				name: 'Draft Trigger',
				parameters: nodeParameters,
			});
			const dbWorkflow = mock<IWorkflowBase>({
				id: workflowId,
				name: 'Test Workflow',
				nodes: [draftNode],
				activeVersion: null,
			});
			workflowLoader.get.mockResolvedValue(dbWorkflow);

			const context = new LocalLoadOptionsContext(nodeTypes, additionalData, path, workflowLoader);

			const result = await context.getWorkflowNodeContext(targetNodeType, true);

			expect(result).toBeInstanceOf(LoadWorkflowNodeContext);
			expect(Workflow).toHaveBeenCalledWith({
				id: workflowId,
				name: 'Test Workflow',
				nodes: [draftNode],
				connections: {},
				active: false,
				nodeTypes,
			});
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

		// Regression test for ADO-5610 / https://github.com/n8n-io/n8n/issues/34517
		// "Parameter from start node in subworkflow don't update in main workflow".
		//
		// The parent "Execute Sub-workflow" node loads its input mapping via
		// loadWorkflowInputMappings -> getWorkflowNodeContext(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, true).
		// When a sub-workflow has an active (published) version, that snapshot is read
		// instead of the current draft nodes. A field the user just added to the
		// sub-workflow's trigger (and saved) therefore never reaches the parent, because
		// the active version snapshot predates the edit.
		//
		// The context used to populate the parent's field list should reflect the latest
		// saved (draft) trigger schema so newly added inputs show up in the main workflow.
		it('should reflect newly added draft input fields even when an older activeVersion exists', async () => {
			const workflowId = 'workflow-123';
			additionalData.currentNodeParameters = {
				workflowId: { value: workflowId },
			};

			// Draft: the user just added the "Tipo de reporte" input to the trigger and saved
			const draftTriggerNode = mock<INode>({
				type: targetNodeType,
				name: 'When Executed by Another Workflow',
				parameters: {
					inputSource: 'workflowInputs',
					workflowInputs: { values: [{ name: 'Tipo de reporte', type: 'string' }] },
				},
			});

			// Active (published) version: stale snapshot from before the edit, no fields defined
			const activeVersionTriggerNode = mock<INode>({
				type: targetNodeType,
				name: 'When Executed by Another Workflow',
				parameters: {
					inputSource: 'workflowInputs',
					workflowInputs: { values: [] },
				},
			});

			const dbWorkflow = mock<IWorkflowBase>({
				id: workflowId,
				name: 'Test Workflow',
				nodes: [draftTriggerNode],
				activeVersion: {
					versionId: 'version-1',
					workflowId,
					nodes: [activeVersionTriggerNode],
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
			// The parent must be built from the latest saved (draft) trigger so the newly
			// added "Tipo de reporte" input is available for mapping — not the stale
			// published snapshot, which would omit the field.
			expect(Workflow).toHaveBeenCalledWith({
				id: workflowId,
				name: 'Test Workflow',
				nodes: [draftTriggerNode],
				connections: {},
				active: false,
				nodeTypes,
			});
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
