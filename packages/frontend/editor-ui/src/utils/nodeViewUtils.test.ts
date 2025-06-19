import {
	getLeftMostNode,
	getTopMostNode,
	getRightMostNode,
	getBottomMostNode,
	getNodesGroupSize,
	generateOffsets,
	getGenericHints,
	getNewNodePosition,
	NODE_SIZE,
	updateViewportToContainNodes,
} from './nodeViewUtils';
import type { INode, INodeTypeDescription, INodeExecutionData, Workflow } from 'n8n-workflow';
import type { INodeUi, XYPosition } from '@/Interface';
import { NodeHelpers, SEND_AND_WAIT_OPERATION } from 'n8n-workflow';

import { describe, it, expect, beforeEach } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { SET_NODE_TYPE, STICKY_NODE_TYPE } from '@/constants';
import { createTestNode } from '@/__tests__/mocks';
import type { GraphNode } from '@vue-flow/core';
import { v4 as uuid } from 'uuid';

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
		mockNode = mock<INodeUi>({ type: 'test' });
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

	it('should return an hint for tool nodes without AI expressions', () => {
		mockNode.type = 'custom-tool-node';
		hasNodeRun = true;
		mockWorkflowNode.parameters = { param1: 'staticValue' };

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
					'No parameters are set up to be filled by AI. Click on the ✨ button next to a parameter to allow AI to set its value.',
				location: 'outputPane',
				whenToDisplay: 'afterExecution',
			},
		]);
	});

	it('should return a hint for sendAndWait operation with multiple input items', () => {
		hasMultipleInputItems = true;
		mockWorkflowNode.parameters.operation = SEND_AND_WAIT_OPERATION;
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
				message: 'This action will run only once, for the first input item',
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
		expect(result).toEqual([220, 220]);
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
		const result = getNewNodePosition(nodes, newPosition, {
			offset: movePosition,
		});
		expect(result).toEqual([220, 220]);
	});

	it('should handle multiple conflicts correctly', () => {
		const nodes: INodeUi[] = [
			createTestNode({ id: '1', position: [100, 100], type: SET_NODE_TYPE }),
			createTestNode({ id: '2', position: [140, 140], type: SET_NODE_TYPE }),
		];
		const newPosition: XYPosition = [100, 100];
		const result = getNewNodePosition(nodes, newPosition);
		expect(result).toEqual([280, 280]);
	});
});

const testNodes: INode[] = [
	createTestNode({ id: 'a', position: [0, 0] }),
	createTestNode({ id: 'b', position: [100, 50] }),
	createTestNode({ id: 'c', position: [50, 100] }),
	createTestNode({ id: 'd', position: [-20, -10] }),
];

describe('getLeftMostNode', () => {
	it('should return the leftmost node', () => {
		const left = getLeftMostNode(testNodes);
		expect(left).toEqual(testNodes[3]);
	});

	it('should handle a single node', () => {
		const single = [testNodes[0]];
		expect(getLeftMostNode(single)).toEqual(testNodes[0]);
	});

	it('should handle nodes with equal positions', () => {
		const equalNodes: INode[] = [
			createTestNode({ id: 'x', position: [10, 20] }),
			createTestNode({ id: 'y', position: [10, 20] }),
		];
		expect(getLeftMostNode(equalNodes)).toEqual(equalNodes[0]);
	});
});

describe('getRightMostNode', () => {
	it('should return the rightmost node', () => {
		const right = getRightMostNode(testNodes);
		expect(right).toEqual(testNodes[1]);
	});

	it('should handle a single node', () => {
		const single = [testNodes[0]];
		expect(getRightMostNode(single)).toEqual(testNodes[0]);
	});

	it('should handle nodes with equal positions', () => {
		const equalNodes: INode[] = [
			createTestNode({ id: 'x', position: [10, 20] }),
			createTestNode({ id: 'y', position: [10, 20] }),
		];
		expect(getRightMostNode(equalNodes)).toEqual(equalNodes[0]);
	});
});

describe('getTopMostNode', () => {
	it('should return the topmost node', () => {
		const top = getTopMostNode(testNodes);
		expect(top).toEqual(testNodes[3]);
	});

	it('should handle a single node', () => {
		const single = [testNodes[0]];
		expect(getTopMostNode(single)).toEqual(testNodes[0]);
	});

	it('should handle nodes with equal positions', () => {
		const equalNodes: INode[] = [
			createTestNode({ id: 'x', position: [10, 20] }),
			createTestNode({ id: 'y', position: [10, 20] }),
		];
		expect(getTopMostNode(equalNodes)).toEqual(equalNodes[0]);
	});
});

describe('getBottomMostNode', () => {
	it('should return the bottommost node', () => {
		const bottom = getBottomMostNode(testNodes);
		expect(bottom).toEqual(testNodes[2]);
	});

	it('should handle a single node', () => {
		const single = [testNodes[0]];
		expect(getBottomMostNode(single)).toEqual(testNodes[0]);
	});

	it('should handle nodes with equal positions', () => {
		const equalNodes: INode[] = [
			createTestNode({ id: 'x', position: [10, 20] }),
			createTestNode({ id: 'y', position: [10, 20] }),
		];
		expect(getBottomMostNode(equalNodes)).toEqual(equalNodes[0]);
	});
});

describe('getNodesGroupSize', () => {
	it('calculates the group size correctly', () => {
		const [width, height] = getNodesGroupSize(testNodes);
		expect(width).toBe(Math.abs(100 - -20) + NODE_SIZE);
		expect(height).toBe(Math.abs(-10 - 100) + NODE_SIZE);
	});

	it('should handle a single node', () => {
		const single = [testNodes[0]];
		const [w, h] = getNodesGroupSize(single);
		expect(w).toBe(NODE_SIZE);
		expect(h).toBe(NODE_SIZE);
	});

	it('should handle nodes with equal positions', () => {
		const equalNodes: INode[] = [
			createTestNode({ id: 'x', position: [10, 20] }),
			createTestNode({ id: 'y', position: [10, 20] }),
		];
		const [we, he] = getNodesGroupSize(equalNodes);
		expect(we).toBe(NODE_SIZE);
		expect(he).toBe(NODE_SIZE);
	});
});

describe(updateViewportToContainNodes, () => {
	it('should return the same viewport if given node is already in the viewport', () => {
		const result = updateViewportToContainNodes(
			{ x: 0, y: 0, zoom: 2 },
			{ width: 1000, height: 800 },
			[createTestGraphNode({ position: { x: 0, y: 0 }, dimensions: { width: 36, height: 36 } })],
			0,
		);

		expect(result).toEqual({ x: 0, y: 0, zoom: 2 });
	});

	it('should return updated viewport with minimal position change to include node outside northwest edge', () => {
		const result = updateViewportToContainNodes(
			{ x: 0, y: 0, zoom: 2 },
			{ width: 1000, height: 800 },
			[
				createTestGraphNode({
					position: { x: -10, y: -20 },
					dimensions: { width: 36, height: 36 },
				}),
			],
			0,
		);

		expect(result).toEqual({ x: 20, y: 40, zoom: 2 });
	});

	it('should return updated viewport with minimal position change to include node outside southeast edge', () => {
		const result = updateViewportToContainNodes(
			{ x: 0, y: 0, zoom: 2 },
			{ width: 1000, height: 800 },
			[
				createTestGraphNode({
					position: { x: 500, y: 400 },
					dimensions: { width: 36, height: 36 },
				}),
			],
			0,
		);

		expect(result).toEqual({ x: -72, y: -72, zoom: 2 });
	});
});

function createTestGraphNode(data: Partial<GraphNode> = {}): GraphNode {
	return {
		computedPosition: { z: 0, ...(data.position ?? { x: 0, y: 0 }) },
		handleBounds: {},
		dimensions: { width: 0, height: 0 },
		isParent: true,
		selected: false,
		resizing: false,
		dragging: false,
		data: undefined,
		events: {},
		type: '',
		id: uuid(),
		position: { x: 0, y: 0 },
		...data,
	};
}
