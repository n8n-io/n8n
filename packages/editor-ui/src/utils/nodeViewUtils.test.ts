import { generateOffsets, getGenericHints, getNewNodePosition } from './nodeViewUtils';
import type { INode, INodeTypeDescription, INodeExecutionData, Workflow } from 'n8n-workflow';
import type { INodeUi, XYPosition } from '@/Interface';
import { NodeHelpers } from 'n8n-workflow';

import { describe, it, expect, beforeEach } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { SET_NODE_TYPE, STICKY_NODE_TYPE } from '@/constants';
import { createTestNode } from '@/__tests__/mocks';

describe('getGenericHints', () => {
	let mockWorkflowNode: MockProxy<INode>;
	let mockNode: MockProxy<INodeUi>;
	let mockNodeType: MockProxy<INodeTypeDescription>;
	let mockNodeOutputData: INodeExecutionData[];
	let mockWorkflow: MockProxy<Workflow>;
	let hasMultipleInputItems: boolean;
	let hasNodeRun: boolean;

	beforeEach(() => {
		mockWorkflowNode = mock<INode>();
		mockNode = mock<INodeUi>();
		mockNodeType = mock<INodeTypeDescription>();
		mockNodeOutputData = [];
		mockWorkflow = mock<Workflow>();

		hasMultipleInputItems = false;
		hasNodeRun = false;
	});

	it('should return a limit reached hint if node output data reaches the limit', () => {
		mockWorkflowNode.parameters.limit = 5;
		mockNodeOutputData = Array(5).fill({ json: {} });
		hasNodeRun = true;

		const hints = getGenericHints({
			workflowNode: mockWorkflowNode,
			node: mockNode,
			nodeType: mockNodeType,
			nodeOutputData: mockNodeOutputData,
			hasMultipleInputItems,
			workflow: mockWorkflow,
			hasNodeRun,
		});

		expect(hints).toEqual([
			{
				message:
					"Limit of 5 items reached. There may be more items that aren't being returned. Tweak the 'Return All' or 'Limit' parameters to access more items.",
				location: 'outputPane',
				whenToDisplay: 'afterExecution',
			},
		]);
	});

	it('should return an Execute Once hint if operation is list-like and Execute Once is not set', () => {
		mockWorkflowNode.parameters.operation = 'getAll';
		hasMultipleInputItems = true;
		mockWorkflow.getNode.mockReturnValue({ executeOnce: false } as unknown as INode);

		const hints = getGenericHints({
			workflowNode: mockWorkflowNode,
			node: mockNode,
			nodeType: mockNodeType,
			nodeOutputData: mockNodeOutputData,
			hasMultipleInputItems,
			workflow: mockWorkflow,
			hasNodeRun,
		});

		expect(hints).toEqual([
			{
				message:
					'This node runs multiple times, once for each input item. Use ‘Execute Once’ in the node settings if you want to run it only once.',
				location: 'outputPane',
			},
		]);
	});

	it('should return a hint for expression in field name if found in Set node', () => {
		mockNode.type = 'n8n-nodes-base.set';
		mockNode.parameters.mode = 'manual';
		mockNodeType.properties = [];

		vi.spyOn(NodeHelpers, 'getNodeParameters').mockReturnValue({
			assignments: {
				assignments: [
					{
						id: 'xxxxx',
						name: '=',
						value: '',
						type: 'string',
					},
				],
			},
			options: {},
		});

		const hints = getGenericHints({
			workflowNode: mockWorkflowNode,
			node: mockNode,
			nodeType: mockNodeType,
			nodeOutputData: mockNodeOutputData,
			hasMultipleInputItems,
			workflow: mockWorkflow,
			hasNodeRun,
		});

		expect(hints).toEqual([
			{
				message:
					"An expression is used in 'Fields to Set' in field 1, did you mean to use it in the value instead?",
				whenToDisplay: 'beforeExecution',
				location: 'outputPane',
			},
		]);
	});

	it('should return Split In Batches setup hints if loop is not set up correctly', () => {
		mockNode.type = 'n8n-nodes-base.splitInBatches';
		mockWorkflow.getChildNodes.mockReturnValue([]);

		const hints = getGenericHints({
			workflowNode: mockWorkflowNode,
			node: mockNode,
			nodeType: mockNodeType,
			nodeOutputData: mockNodeOutputData,
			hasMultipleInputItems,
			workflow: mockWorkflow,
			hasNodeRun,
		});

		expect(hints).toEqual([
			{
				message: "No nodes connected to the 'loop' output of this node",
				whenToDisplay: 'beforeExecution',
				location: 'outputPane',
			},
		]);
	});
});

describe('generateOffsets', () => {
	it('should return correct offsets for 0 nodes', () => {
		const result = generateOffsets(0, 100, 20);
		expect(result).toEqual([]);
	});

	it('should return correct offsets for 1 node', () => {
		const result = generateOffsets(1, 100, 20);
		expect(result).toEqual([0]);
	});

	it('should return correct offsets for 2 nodes', () => {
		const result = generateOffsets(2, 100, 20);
		expect(result).toEqual([-100, 100]);
	});

	it('should return correct offsets for 3 nodes', () => {
		const result = generateOffsets(3, 100, 20);
		expect(result).toEqual([-120, 0, 120]);
	});

	it('should return correct offsets for 4 nodes', () => {
		const result = generateOffsets(4, 100, 20);
		expect(result).toEqual([-220, -100, 100, 220]);
	});

	it('should return correct offsets for large node count', () => {
		const result = generateOffsets(10, 100, 20);
		expect(result).toEqual([-580, -460, -340, -220, -100, 100, 220, 340, 460, 580]);
	});
});

describe('getNewNodePosition', () => {
	it('should return the new position when there are no conflicts', () => {
		const nodes: INodeUi[] = [];
		const newPosition: XYPosition = [100, 100];
		const result = getNewNodePosition(nodes, newPosition);
		expect(result).toEqual([100, 100]);
	});

	it('should adjust the position to the closest grid size', () => {
		const nodes: INodeUi[] = [];
		const newPosition: XYPosition = [105, 115];
		const result = getNewNodePosition(nodes, newPosition);
		expect(result).toEqual([120, 120]);
	});

	it('should move the position to avoid conflicts', () => {
		const nodes: INodeUi[] = [
			createTestNode({ id: '1', position: [100, 100], type: SET_NODE_TYPE }),
		];
		const newPosition: XYPosition = [100, 100];
		const result = getNewNodePosition(nodes, newPosition);
		expect(result).toEqual([180, 180]);
	});

	it('should skip nodes in the conflict allowlist', () => {
		const nodes: INodeUi[] = [
			createTestNode({ id: '1', position: [100, 100], type: STICKY_NODE_TYPE }),
		];
		const newPosition: XYPosition = [100, 100];
		const result = getNewNodePosition(nodes, newPosition);
		expect(result).toEqual([100, 100]);
	});

	it('should use the provided move position to resolve conflicts', () => {
		const nodes: INodeUi[] = [
			createTestNode({ id: '1', position: [100, 100], type: SET_NODE_TYPE }),
		];
		const newPosition: XYPosition = [100, 100];
		const movePosition: XYPosition = [50, 50];
		const result = getNewNodePosition(nodes, newPosition, movePosition);
		expect(result).toEqual([200, 200]);
	});

	it('should handle multiple conflicts correctly', () => {
		const nodes: INodeUi[] = [
			createTestNode({ id: '1', position: [100, 100], type: SET_NODE_TYPE }),
			createTestNode({ id: '2', position: [140, 140], type: SET_NODE_TYPE }),
		];
		const newPosition: XYPosition = [100, 100];
		const result = getNewNodePosition(nodes, newPosition);
		expect(result).toEqual([220, 220]);
	});
});
