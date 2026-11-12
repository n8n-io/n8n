import { describe, expect, it } from 'vitest';

import { findActionTargetPath } from '../attachments';
import { GraphValidationError } from '../graph-validation.error';
import { validateExecutableGraph } from '../validate-executable-graph';
import type { GraphAttachment, GraphNode, WorkflowGraph } from '../workflow-graph';

// trigger -> agent; model and tool attach to the agent
const baseNodes: GraphNode[] = [
	{ id: 'trigger', name: 'T', type: 'trigger' },
	{ id: 'agent', name: 'Agent', type: 'v1-node', actionTargetKinds: ['ai_tool'] },
	{ id: 'model', name: 'Model', type: 'attached' },
	{ id: 'tool', name: 'Tool', type: 'attached' },
];
const baseAttachments: GraphAttachment[] = [
	{ from: 'model', to: 'agent', kind: 'ai_languageModel', inputIndex: 0 },
	{ from: 'tool', to: 'agent', kind: 'ai_tool', inputIndex: 0 },
];
const agentGraph: WorkflowGraph = {
	nodes: baseNodes,
	edges: [{ from: 'trigger', to: 'agent', outputIndex: 0, inputIndex: 0 }],
	attachments: baseAttachments,
};

function withChanges(changes: Partial<WorkflowGraph>): WorkflowGraph {
	return { ...agentGraph, ...changes };
}

describe('validateExecutableGraph with attachments', () => {
	it('accepts sub-nodes attached to a node the trigger reaches', () => {
		expect(() => validateExecutableGraph(agentGraph)).not.toThrow();
	});

	it('accepts a graph without an attachments list', () => {
		const { attachments: _, ...graph } = withChanges({ nodes: baseNodes.slice(0, 2) });

		expect(() => validateExecutableGraph(graph)).not.toThrow();
	});

	it.each([
		{ end: 'from', attachment: { from: 'ghost', to: 'agent', kind: 'ai_tool', inputIndex: 0 } },
		{ end: 'to', attachment: { from: 'tool', to: 'ghost', kind: 'ai_tool', inputIndex: 0 } },
	])('rejects an attachment whose $end node is not in the graph', ({ attachment }) => {
		const graph = withChanges({ attachments: [...baseAttachments, attachment] });

		expect(() => validateExecutableGraph(graph)).toThrow(GraphValidationError);
		expect(() => validateExecutableGraph(graph)).toThrow('"ghost", which is not in the graph');
	});

	it('rejects an attachment that starts at a node that is not attached', () => {
		const graph = withChanges({
			nodes: [...baseNodes, { id: 'plain', name: 'Plain', type: 'v1-node' }],
			attachments: [
				...baseAttachments,
				{ from: 'plain', to: 'agent', kind: 'ai_tool', inputIndex: 0 },
			],
		});

		expect(() => validateExecutableGraph(graph)).toThrow(
			'starts at "Plain", which is not an attached node',
		);
	});

	it.each([
		{ direction: 'out of', edge: { from: 'tool', to: 'agent', outputIndex: 0, inputIndex: 1 } },
		{ direction: 'into', edge: { from: 'agent', to: 'tool', outputIndex: 0, inputIndex: 0 } },
	])('rejects an edge $direction an attached node', ({ edge }) => {
		const graph = withChanges({ edges: [...agentGraph.edges, edge] });

		expect(() => validateExecutableGraph(graph)).toThrow(GraphValidationError);
		expect(() => validateExecutableGraph(graph)).toThrow('touches attached node "Tool"');
	});

	it('rejects an attached node that has no attachment', () => {
		const graph = withChanges({ attachments: [baseAttachments[0]] });

		expect(() => validateExecutableGraph(graph)).toThrow(
			'Attached node "Tool" does not lead through attachments to a node the trigger reaches',
		);
	});

	it('rejects an attached node that leads only to a node the trigger cannot reach', () => {
		const graph = withChanges({
			nodes: [...baseNodes, { id: 'parked', name: 'Parked', type: 'v1-node' }],
			attachments: [
				baseAttachments[0],
				{ from: 'tool', to: 'parked', kind: 'ai_tool', inputIndex: 0 },
			],
		});

		expect(() => validateExecutableGraph(graph)).toThrow('Attached node "Tool" does not lead');
	});

	it('accepts a chain of attachments that ends at a reachable node', () => {
		// tool -> gate -> agent: a human approval gates the tool
		const graph = withChanges({
			nodes: [...baseNodes, { id: 'gate', name: 'Gate', type: 'attached' }],
			attachments: [
				baseAttachments[0],
				{ from: 'tool', to: 'gate', kind: 'ai_tool', inputIndex: 0 },
				{ from: 'gate', to: 'agent', kind: 'ai_tool', inputIndex: 0 },
			],
		});

		expect(() => validateExecutableGraph(graph)).not.toThrow();
	});

	it('rejects attachments that form a cycle', () => {
		const graph = withChanges({
			nodes: [...baseNodes, { id: 'gate', name: 'Gate', type: 'attached' }],
			attachments: [
				...baseAttachments,
				{ from: 'tool', to: 'gate', kind: 'ai_tool', inputIndex: 0 },
				{ from: 'gate', to: 'tool', kind: 'ai_tool', inputIndex: 0 },
			],
		});

		expect(() => validateExecutableGraph(graph)).toThrow(GraphValidationError);
		expect(() => validateExecutableGraph(graph)).toThrow('Attachments form a cycle through');
	});
});

describe('findActionTargetPath', () => {
	// agent <- tool; agent <- gate <- gatedTool; agent <- subAgent <- subTool
	const graph: WorkflowGraph = {
		nodes: [
			...baseNodes,
			{ id: 'gate', name: 'Gate', type: 'attached', actionTargetKinds: ['ai_tool'] },
			{ id: 'gatedTool', name: 'Gated tool', type: 'attached' },
			{ id: 'subAgent', name: 'Sub agent', type: 'attached', actionTargetKinds: ['ai_tool'] },
			{ id: 'subTool', name: 'Sub tool', type: 'attached' },
			{ id: 'plainRoot', name: 'Plain root', type: 'v1-node' },
			{ id: 'plainTool', name: 'Plain tool', type: 'attached' },
		],
		edges: agentGraph.edges,
		attachments: [
			...baseAttachments,
			{ from: 'gate', to: 'agent', kind: 'ai_tool', inputIndex: 0 },
			{ from: 'gatedTool', to: 'gate', kind: 'ai_tool', inputIndex: 0 },
			{ from: 'subAgent', to: 'agent', kind: 'ai_tool', inputIndex: 0 },
			{ from: 'subTool', to: 'subAgent', kind: 'ai_tool', inputIndex: 0 },
			{ from: 'plainTool', to: 'plainRoot', kind: 'ai_tool', inputIndex: 0 },
		],
	};

	it.each([
		{
			declaring: 'agent',
			target: 'tool',
			expected: { kind: 'ai_tool', attachedToNodeId: 'agent' },
		},
		{
			declaring: 'agent',
			target: 'gatedTool',
			expected: { kind: 'ai_tool', attachedToNodeId: 'gate' },
		},
		{
			declaring: 'subAgent',
			target: 'subTool',
			expected: { kind: 'ai_tool', attachedToNodeId: 'subAgent' },
		},
		// ADR consequence: the check alone cannot stop an outer agent from calling a nested tool
		{
			declaring: 'agent',
			target: 'subTool',
			expected: { kind: 'ai_tool', attachedToNodeId: 'subAgent' },
		},
	])('allows $declaring to target $target', ({ declaring, target, expected }) => {
		expect(findActionTargetPath(graph, declaring, target)).toEqual(expected);
	});

	it.each([
		{ reason: 'the hop kind is not allowed', declaring: 'agent', target: 'model' },
		{ reason: 'the target is not attached', declaring: 'agent', target: 'trigger' },
		{ reason: 'the target is the declaring node', declaring: 'subAgent', target: 'subAgent' },
		{
			reason: 'the target does not lead to the declaring node',
			declaring: 'subAgent',
			target: 'tool',
		},
		{
			reason: 'the node it attaches to allows no kinds',
			declaring: 'plainRoot',
			target: 'plainTool',
		},
		{ reason: 'the target is not in the graph', declaring: 'agent', target: 'ghost' },
	])('returns null when $reason', ({ declaring, target }) => {
		expect(findActionTargetPath(graph, declaring, target)).toBeNull();
	});

	it('returns null when a hop on the path has a kind its node does not allow', () => {
		const gateAllowsNothing: WorkflowGraph = {
			...graph,
			nodes: graph.nodes.map((node) =>
				node.id === 'gate' ? { ...node, actionTargetKinds: [] } : node,
			),
		};

		expect(findActionTargetPath(gateAllowsNothing, 'agent', 'gatedTool')).toBeNull();
	});
});
