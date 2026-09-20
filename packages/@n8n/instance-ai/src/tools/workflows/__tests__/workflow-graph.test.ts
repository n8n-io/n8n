import { describe, expect, it } from 'vitest';

import { compileWorkflowGraph, workflowGraphSchema } from '../workflow-graph';

const graph = workflowGraphSchema.parse({
	nodes: [
		{ name: 'Start', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, parameters: {} },
		{
			name: 'Loop',
			type: 'n8n-nodes-base.splitInBatches',
			typeVersion: 3,
			parameters: { batchSize: 1 },
		},
		{ name: 'Check', type: 'n8n-nodes-base.if', typeVersion: 2.2, parameters: {} },
		{
			name: 'Send',
			type: 'n8n-nodes-base.gmail',
			typeVersion: 2.1,
			parameters: { sendTo: '={{ $json.email }}' },
			options: { alwaysOutputData: true, onError: 'continueErrorOutput' },
		},
		{ name: 'Merge', type: 'n8n-nodes-base.merge', typeVersion: 3.2, parameters: {} },
		{ name: 'Done', type: 'n8n-nodes-base.noOp', typeVersion: 1, parameters: {} },
	],
	edges: [
		{ from: 'Start', to: 'Loop' },
		{ from: 'Loop', to: 'Done' },
		{ from: 'Loop', to: 'Check', output: 1 },
		{ from: 'Check', to: 'Send' },
		{ from: 'Check', to: 'Merge', output: 1, input: 1 },
		{ from: 'Send', to: 'Merge' },
		{ from: 'Send', to: 'Merge', output: 1, input: 1 },
		{ from: 'Merge', to: 'Loop' },
	],
	groups: [{ name: 'Process candidate', nodes: ['Check', 'Send', 'Merge'] }],
	settings: { executionOrder: 'v1', timezone: 'Europe/Madrid' },
});

describe('deterministic workflow graph assembly', () => {
	it('produces identical JSON without changing the graph or its parameters', () => {
		const before = structuredClone(graph);
		const first = compileWorkflowGraph('HR outreach', graph);
		expect(JSON.stringify(compileWorkflowGraph('HR outreach', graph))).toBe(JSON.stringify(first));
		expect(graph).toEqual(before);
		expect(first.nodes).toHaveLength(graph.nodes.length);
		expect(new Set(first.nodes.map(({ id }) => id)).size).toBe(graph.nodes.length);
		for (const node of first.nodes) {
			expect(node.position).toEqual([expect.any(Number), expect.any(Number)]);
			expect(node.parameters).toEqual(
				graph.nodes.find(({ name }) => name === node.name)?.parameters,
			);
		}
		expect(first.nodes.find(({ name }) => name === 'Send')).toMatchObject({
			alwaysOutputData: true,
			onError: 'continueErrorOutput',
		});
		expect(first.settings).toEqual(graph.settings);
		expect(first.nodeGroups?.[0].nodeIds).toEqual(
			first.nodes
				.filter(({ name }) => ['Check', 'Send', 'Merge'].includes(name ?? ''))
				.map(({ id }) => id),
		);
	});

	it('keeps branch outputs, Merge inputs, error routes, and loopbacks', () => {
		const { connections } = compileWorkflowGraph('HR outreach', graph);
		expect(connections.Loop.main).toEqual([
			[{ node: 'Done', type: 'main', index: 0 }],
			[{ node: 'Check', type: 'main', index: 0 }],
		]);
		expect(connections.Check.main[1]).toEqual([{ node: 'Merge', type: 'main', index: 1 }]);
		expect(connections.Send.main[1]).toEqual([{ node: 'Merge', type: 'main', index: 1 }]);
		expect(connections.Merge.main[0]).toEqual([{ node: 'Loop', type: 'main', index: 0 }]);
	});

	it('keeps node and group identities when input order changes', () => {
		const first = compileWorkflowGraph('HR outreach', graph);
		const reordered = compileWorkflowGraph('HR outreach', {
			...graph,
			nodes: [...graph.nodes].reverse(),
		});
		for (const node of first.nodes) {
			expect(reordered.nodes.find(({ name }) => name === node.name)?.id).toBe(node.id);
		}
		expect(reordered.nodeGroups).toEqual(first.nodeGroups);
	});

	it('keeps sparse outputs, fan-out, and AI connection types', () => {
		const input = {
			...graph,
			edges: [
				{ from: 'Start', to: 'Check', output: 3 },
				{ from: 'Start', to: 'Send', output: 3 },
				{ from: 'Send', to: 'Check', type: 'ai_tool' as const },
			],
		};
		const { connections } = compileWorkflowGraph('Connections', input);
		expect(connections.Start.main).toEqual([
			[],
			[],
			[],
			[
				{ node: 'Check', type: 'main', index: 0 },
				{ node: 'Send', type: 'main', index: 0 },
			],
		]);
		expect(connections.Send.ai_tool).toEqual([[{ node: 'Check', type: 'ai_tool', index: 0 }]]);
	});

	it.each(['from', 'to'] as const)('rejects an unknown %s node', (field) => {
		expect(() =>
			compileWorkflowGraph('Invalid', {
				...graph,
				edges: [{ from: 'Start', to: 'Loop', [field]: 'Missing' }],
			}),
		).toThrow('Unknown connection node');
	});

	it('rejects duplicate node names and edges', () => {
		expect(() =>
			compileWorkflowGraph('Invalid', { ...graph, nodes: [...graph.nodes, graph.nodes[0]] }),
		).toThrow('Duplicate node name');
		expect(() =>
			compileWorkflowGraph('Invalid', { ...graph, edges: [...graph.edges, graph.edges[0]] }),
		).toThrow('Duplicate connection');
	});

	it('rejects unknown or repeated group members', () => {
		for (const members of [['Missing'], ['Start', 'Start']]) {
			expect(() =>
				compileWorkflowGraph('Invalid', {
					...graph,
					groups: [{ name: 'Invalid', nodes: members }],
				}),
			).toThrow(/group/i);
		}
	});

	it.each(['id', 'position', 'unknownOption'])(
		'rejects the %s option instead of discarding it',
		(key) => {
			expect(() =>
				compileWorkflowGraph('Invalid', {
					...graph,
					nodes: [{ ...graph.nodes[0], options: { [key]: 'invalid' } }],
				}),
			).toThrow('Unsupported node option');
		},
	);

	it('does not generate webhook IDs during assembly', () => {
		const input = {
			nodes: [
				{
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 2,
					parameters: { path: 'intake' },
				},
			],
			edges: [],
		};
		const first = compileWorkflowGraph('Intake', input);
		expect(first).toEqual(compileWorkflowGraph('Intake', input));
		expect(first.nodes[0].webhookId).toBeUndefined();
	});
});
