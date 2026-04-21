/**
 * Regression test for GHC-7722
 *
 * Bug: When importing execution data that contains multiple JSON items into a
 * trigger-based workflow, the workflow only executes once instead of processing
 * each item individually.
 *
 * Root cause: In recreateNodeExecutionStack, when a trigger node (start node with
 * no incoming connections) has runData, the function creates a dummy item
 * [{ json: {} }] instead of using the actual data from runData.
 *
 * Expected: When trigger node has runData with multiple items, those items should
 * be used in the execution stack
 * Actual: A single dummy item [{ json: {} }] is created, ignoring the trigger's runData
 */

import { DirectedGraph } from '../directed-graph';
import { recreateNodeExecutionStack } from '../recreate-node-execution-stack';
import type { INode, INodeExecutionData, IPinData, IRunData } from 'n8n-workflow';

describe('recreateNodeExecutionStack - Trigger with Multiple Items (GHC-7722)', () => {
	it('should use trigger runData when trigger node has data', () => {
		// Setup: Create a simple workflow: Trigger -> Code
		const triggerNode: INode = {
			id: 'trigger-id',
			name: 'Google Drive Trigger',
			type: 'n8n-nodes-base.googleDriveTrigger',
			typeVersion: 1,
			position: [250, 300],
			parameters: {},
		};

		const codeNode: INode = {
			id: 'code-id',
			name: 'Code',
			type: 'n8n-nodes-base.code',
			typeVersion: 2,
			position: [450, 300],
			parameters: {
				mode: 'runOnceForAllItems',
				jsCode: 'return items;',
			},
		};

		// Create graph with trigger -> code connection
		const graph = new DirectedGraph();
		graph.addNodes(triggerNode, codeNode);
		graph.addConnection({
			from: triggerNode,
			to: codeNode,
			type: 'main',
			outputIndex: 0,
			inputIndex: 0,
		});

		// Create trigger runData with 2 items (simulating imported execution data)
		const triggerItems: INodeExecutionData[] = [
			{
				json: {
					id: '1',
					name: 'Document 1',
					mimeType: 'application/pdf',
				},
			},
			{
				json: {
					id: '2',
					name: 'Document 2',
					mimeType: 'application/pdf',
				},
			},
		];

		const runData: IRunData = {
			[triggerNode.name]: [
				{
					startTime: Date.now(),
					executionTime: 100,
					executionStatus: 'success',
					data: {
						main: [triggerItems], // 2 items from trigger
					},
				},
			],
		};

		const pinData: IPinData = {};

		// Act: Recreate execution stack starting from code node
		// (This simulates manually executing after importing execution data)
		const result = recreateNodeExecutionStack(graph, new Set([codeNode]), runData, pinData);

		// Assert: The node execution stack should contain the code node with data from trigger
		expect(result.nodeExecutionStack).toHaveLength(1);
		expect(result.nodeExecutionStack[0].node).toBe(codeNode);

		// THIS IS THE FAILING ASSERTION - demonstrates the bug
		// Expected: triggerItems (2 items from imported execution)
		// Actual: Currently creates dummy data [{ json: {} }] because the trigger
		// has no incoming connections, and the code doesn't check runData for trigger nodes
		const codeNodeData = result.nodeExecutionStack[0].data.main?.[0];
		expect(codeNodeData).toBeDefined();
		expect(codeNodeData).toHaveLength(2); // Should have 2 items, not 1
		expect(codeNodeData).toEqual(triggerItems); // Should match the trigger's output
	});

	it('should handle trigger node without runData', () => {
		// When a trigger has no execution data and we start from a downstream node,
		// the trigger should still provide data to the downstream node
		const triggerNode: INode = {
			id: 'trigger-id',
			name: 'Manual Trigger',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [250, 300],
			parameters: {},
		};

		const setNode: INode = {
			id: 'set-id',
			name: 'Set',
			type: 'n8n-nodes-base.set',
			typeVersion: 1,
			position: [450, 300],
			parameters: {},
		};

		const graph = new DirectedGraph();
		graph.addNodes(triggerNode, setNode);
		graph.addConnection({
			from: triggerNode,
			to: setNode,
			type: 'main',
			outputIndex: 0,
			inputIndex: 0,
		});

		// Empty runData - trigger has no execution data
		const runData: IRunData = {};
		const pinData: IPinData = {};

		const result = recreateNodeExecutionStack(graph, new Set([setNode]), runData, pinData);

		// When there's no runData for the trigger and we're starting from a downstream node,
		// the current behavior is that nothing gets executed (empty stack, no waiting)
		// This documents the actual behavior - the node needs data from somewhere
		expect(result.nodeExecutionStack).toHaveLength(0);
		expect(result.waitingExecution).toEqual({});
		expect(result.waitingExecutionSource).toEqual({});
	});
});
