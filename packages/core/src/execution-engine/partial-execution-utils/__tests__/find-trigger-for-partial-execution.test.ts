import { mock } from 'jest-mock-extended';
import type { IConnections, INode, INodeType, INodeTypes, IPinData, IRunData } from 'n8n-workflow';
import { Workflow } from 'n8n-workflow';

import { createNodeData, toIConnections, toITaskData } from './helpers';
import { DirectedGraph } from '../directed-graph';
import { findTriggerForPartialExecution } from '../find-trigger-for-partial-execution';

describe('findTriggerForPartialExecution', () => {
	const nodeTypes = mock<INodeTypes>();

	const createMockWorkflow = (nodes: INode[], connections: IConnections, pinData?: IPinData) =>
		new Workflow({
			active: false,
			nodes,
			connections,
			nodeTypes,
			pinData,
		});

	const createNode = (name: string, type: string, disabled = false) =>
		mock<INode>({ name, type, disabled });
	const manualTriggerNode = createNode('ManualTrigger', 'n8n-nodes-base.manualTrigger');
	const disabledTriggerNode = createNode('DisabledTrigger', 'n8n-nodes-base.manualTrigger', true);
	const pinnedTrigger = createNode('PinnedTrigger', 'n8n-nodes-base.manualTrigger');
	const setNode = createNode('Set', 'n8n-nodes-base.set');
	const noOpNode = createNode('No Operation', 'n8n-nodes-base.noOp');
	const webhookNode = createNode('Webhook', 'n8n-nodes-base.webhook');
	const webhookNode1 = createNode('Webhook1', 'n8n-nodes-base.webhook');

	beforeEach(() => {
		nodeTypes.getByNameAndVersion.mockImplementation((type) => {
			const isTrigger = type.endsWith('Trigger') || type.endsWith('webhook');
			return mock<INodeType>({
				description: {
					group: isTrigger ? ['trigger'] : [],
					properties: [],
				},
			});
		});
	});

	const testGroups: Record<
		string,
		Array<{
			description: string;
			nodes: INode[];
			connections: Array<{ to: INode; from: INode }>;
			destinationNodeName: string;
			pinData?: IPinData;
			expectedTrigger?: INode;
		}>
	> = {
		'Single trigger node': [
			{
				description: 'should return the destination node if it is a trigger',
				nodes: [manualTriggerNode],
				connections: [],
				destinationNodeName: manualTriggerNode.name,
				expectedTrigger: manualTriggerNode,
			},
			{
				description: 'should return a parent trigger node for a non-trigger destination',
				nodes: [manualTriggerNode, setNode],
				connections: [{ from: manualTriggerNode, to: setNode }],
				destinationNodeName: setNode.name,
				expectedTrigger: manualTriggerNode,
			},
		],
		'Multiple trigger nodes': [
			{
				description: 'should prioritize webhook nodes when multiple parent triggers exist',
				nodes: [webhookNode, manualTriggerNode, setNode],
				connections: [
					{ from: webhookNode, to: setNode },
					{ from: manualTriggerNode, to: setNode },
				],
				destinationNodeName: setNode.name,
				expectedTrigger: webhookNode,
			},
			{
				description: 'should handle multiple webhook triggers',
				nodes: [webhookNode, webhookNode1, setNode],
				connections: [
					{ from: webhookNode, to: setNode },
					{ from: webhookNode1, to: setNode },
				],
				destinationNodeName: setNode.name,
				expectedTrigger: webhookNode1,
			},
			{
				description: 'should prioritize webhook node, even if it is further up',
				nodes: [manualTriggerNode, setNode, noOpNode, webhookNode],
				connections: [
					{ from: manualTriggerNode, to: setNode },
					{ from: setNode, to: noOpNode },
					{ from: webhookNode, to: noOpNode },
				],
				destinationNodeName: noOpNode.name,
				expectedTrigger: webhookNode,
			},
			{
				description: 'should ignore disabled parent trigger nodes',
				nodes: [disabledTriggerNode, manualTriggerNode, setNode],
				connections: [
					{ from: disabledTriggerNode, to: setNode },
					{ from: manualTriggerNode, to: setNode },
				],
				destinationNodeName: setNode.name,
				expectedTrigger: manualTriggerNode,
			},
		],
		'No trigger nodes': [
			{
				description: 'should return undefined when no valid parent triggers found',
				nodes: [setNode, noOpNode],
				connections: [{ from: setNode, to: noOpNode }],
				destinationNodeName: noOpNode.name,
				expectedTrigger: undefined,
			},
		],
		'Trigger node with pinned data': [
			{
				description: 'should prioritize pinned trigger nodes',
				nodes: [pinnedTrigger, manualTriggerNode, setNode],
				connections: [
					{ from: pinnedTrigger, to: setNode },
					{ from: manualTriggerNode, to: setNode },
				],
				destinationNodeName: setNode.name,
				pinData: { [pinnedTrigger.name]: [{ json: { test: true } }] },
				expectedTrigger: pinnedTrigger,
			},
			{
				description: 'should prioritize pinned webhook triggers',
				nodes: [pinnedTrigger, manualTriggerNode, webhookNode, setNode],
				connections: [
					{ from: pinnedTrigger, to: setNode },
					{ from: webhookNode, to: setNode },
					{ from: manualTriggerNode, to: setNode },
				],
				destinationNodeName: setNode.name,
				pinData: {
					[pinnedTrigger.name]: [{ json: { test: true } }],
					[webhookNode.name]: [{ json: { test: true } }],
				},
				expectedTrigger: webhookNode,
			},
			{
				description: 'should prioritize the first connected pinned webhook triggers',
				nodes: [webhookNode, webhookNode1, pinnedTrigger, manualTriggerNode, setNode],
				connections: [
					{ from: pinnedTrigger, to: setNode },
					{ from: webhookNode, to: setNode },
					{ from: webhookNode1, to: setNode },
					{ from: manualTriggerNode, to: setNode },
				],
				destinationNodeName: setNode.name,
				pinData: {
					[pinnedTrigger.name]: [{ json: { test: true } }],
					[webhookNode.name]: [{ json: { test: true } }],
					[webhookNode1.name]: [{ json: { test: true } }],
				},
				expectedTrigger: webhookNode,
			},
			{
				description: 'should prioritize the first connected pinned webhook triggers (reverse)',
				nodes: [webhookNode1, webhookNode, pinnedTrigger, manualTriggerNode, setNode],
				connections: [
					{ from: pinnedTrigger, to: setNode },
					{ from: webhookNode1, to: setNode },
					{ from: webhookNode, to: setNode },
					{ from: manualTriggerNode, to: setNode },
				],
				destinationNodeName: setNode.name,
				pinData: {
					[pinnedTrigger.name]: [{ json: { test: true } }],
					[webhookNode.name]: [{ json: { test: true } }],
					[webhookNode1.name]: [{ json: { test: true } }],
				},
				expectedTrigger: webhookNode1,
			},
		],
	};

	for (const [group, tests] of Object.entries(testGroups)) {
		describe(group, () => {
			test.each(tests)(
				'$description',
				({ nodes, connections, destinationNodeName, expectedTrigger, pinData }) => {
					const workflow = createMockWorkflow(nodes, toIConnections(connections), pinData);
					expect(findTriggerForPartialExecution(workflow, destinationNodeName, {})).toBe(
						expectedTrigger,
					);
				},
			);
		});
	}

	describe('Error and Edge Case Handling', () => {
		it('should handle non-existent destination node gracefully', () => {
			const workflow = createMockWorkflow([], {});
			expect(findTriggerForPartialExecution(workflow, 'NonExistentNode', {})).toBeUndefined();
		});

		it('should handle empty workflow', () => {
			const workflow = createMockWorkflow([], {});
			expect(findTriggerForPartialExecution(workflow, '', {})).toBeUndefined();
		});

		it('should handle workflow with no connections', () => {
			const workflow = createMockWorkflow([manualTriggerNode], {});
			expect(findTriggerForPartialExecution(workflow, manualTriggerNode.name, {})).toBe(
				manualTriggerNode,
			);
		});

		it('should prefer triggers that have run data', () => {
			// ARRANGE
			const trigger1 = createNodeData({ name: 'trigger1', type: 'n8n-nodes-base.manualTrigger' });
			const trigger2 = createNodeData({ name: 'trigger2', type: 'n8n-nodes-base.manualTrigger' });
			const node = createNodeData({ name: 'node' });
			const workflow = new DirectedGraph()
				.addNodes(trigger1, trigger2, node)
				.addConnections({ from: trigger1, to: node }, { from: trigger2, to: node })
				.toWorkflow({ name: '', active: false, nodeTypes });
			const runData: IRunData = {
				[trigger1.name]: [toITaskData([{ data: { nodeName: 'trigger1' } }])],
			};

			// ACT
			const chosenTrigger = findTriggerForPartialExecution(workflow, node.name, runData);

			// ASSERT
			expect(chosenTrigger).toBe(trigger1);
		});
	});
});
