import { describe, it, expect } from 'vitest';
import type { IConnections } from 'n8n-workflow';
import {
	orderSelectionIntoSet,
	resolveSetNeighbors,
	resolveSetCanvasGroup,
	buildNodesAttachment,
	mergeNodeSets,
} from './buildNodesAttachment';
import type { NodeContextWorkflow } from './buildNodesAttachment';
import { instanceAiNodesAttachmentSchema } from '@n8n/api-types';

function wf(over: Partial<NodeContextWorkflow> = {}): NodeContextWorkflow {
	return {
		nodes: [
			{ id: 'n1', name: 'A', type: 't' },
			{ id: 'n2', name: 'B', type: 't' },
			{ id: 'n3', name: 'C', type: 't' },
		],
		connections: {},
		groupsById: new Map(),
		nodeIdToGroupId: new Map(),
		...over,
	};
}

function chain(...pairs: Array<[string, string]>): IConnections {
	const c: IConnections = {};
	for (const [from, to] of pairs) {
		c[from] ??= { main: [[]] };
		(c[from].main[0] ??= []).push({ node: to, type: 'main', index: 0 });
	}
	return c;
}

describe('orderSelectionIntoSet', () => {
	it('orders a connected chain input→output', () => {
		const conns = chain(['A', 'B'], ['B', 'C']);
		expect(orderSelectionIntoSet(['A', 'B', 'C'], conns).nodeNames).toEqual(['A', 'B', 'C']);
	});

	it('keeps unconnected selected nodes in the one set — the selection is the grouping', () => {
		const conns = chain(['A', 'X'], ['X', 'B']); // X is NOT selected
		expect(orderSelectionIntoSet(['A', 'B'], conns).nodeNames).toEqual(['A', 'B']);
	});

	it('keeps chains contiguous, disconnected members after', () => {
		const conns = chain(['A', 'B']);
		expect(orderSelectionIntoSet(['Lone', 'A', 'B'], conns).nodeNames).toEqual(['Lone', 'A', 'B']);
	});

	it('includes a sub-node picked with its parent (non-main connection)', () => {
		const conns: IConnections = {
			Trigger: { main: [[{ node: 'Agent', type: 'main', index: 0 }]] },
			Model: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
		};
		const { nodeNames } = orderSelectionIntoSet(['Trigger', 'Agent', 'Model'], conns);
		expect(nodeNames.slice().sort()).toEqual(['Agent', 'Model', 'Trigger']);
	});
});

describe('resolveSetNeighbors', () => {
	it('finds the external input feeding the set head', () => {
		const conns = chain(['Webhook', 'A'], ['A', 'B']);
		const r = resolveSetNeighbors({ nodeNames: ['A', 'B'] }, conns);
		expect(r.inputName).toBe('Webhook');
		expect(r.outputName).toBeUndefined();
	});

	it('finds the external output the set tail feeds', () => {
		const conns = chain(['A', 'B'], ['B', 'Slack']);
		const r = resolveSetNeighbors({ nodeNames: ['A', 'B'] }, conns);
		expect(r.outputName).toBe('Slack');
	});

	it('returns undefined at both edges when the set spans a whole isolated chain', () => {
		const conns = chain(['A', 'B']);
		const r = resolveSetNeighbors({ nodeNames: ['A', 'B'] }, conns);
		expect(r.inputName).toBeUndefined();
		expect(r.outputName).toBeUndefined();
	});
});

describe('resolveSetCanvasGroup', () => {
	it('returns the group when the whole set shares one', () => {
		const w = wf({
			groupsById: new Map([['g1', { id: 'g1', name: 'My Group 1' }]]),
			nodeIdToGroupId: new Map([
				['n1', 'g1'],
				['n2', 'g1'],
			]),
		});
		const r = resolveSetCanvasGroup({ nodeNames: ['A', 'B'] }, w);
		expect(r).toEqual({ canvasGroupId: 'g1', canvasGroupName: 'My Group 1' });
	});

	it('returns {} when the set mixes groups or grouped+ungrouped', () => {
		const w = wf({ nodeIdToGroupId: new Map([['n1', 'g1']]) }); // n2 ungrouped
		expect(resolveSetCanvasGroup({ nodeNames: ['A', 'B'] }, w)).toEqual({});
	});

	it('returns {} when no node in the set is grouped', () => {
		expect(resolveSetCanvasGroup({ nodeNames: ['A', 'B'] }, wf())).toEqual({});
	});

	it('returns {} for a lone grouped node so it keeps its own name, not the group label', () => {
		const w = wf({
			groupsById: new Map([['g1', { id: 'g1', name: 'My Group 1' }]]),
			nodeIdToGroupId: new Map([
				['n1', 'g1'],
				['n2', 'g1'],
			]),
		});
		expect(resolveSetCanvasGroup({ nodeNames: ['A'] }, w)).toEqual({});
	});
});

describe('buildNodesAttachment', () => {
	it('returns null for an empty selection', () => {
		expect(buildNodesAttachment('w1', [], wf())).toBeNull();
	});

	it('builds one schema-valid set for a chain + a lone node', () => {
		const w = wf({
			nodes: [
				{ id: 'n1', name: 'A', type: 't' },
				{ id: 'n2', name: 'B', type: 't' },
				{ id: 'n3', name: 'Lone', type: 't' },
				{ id: 'n0', name: 'Webhook', type: 't' },
			],
			connections: chain(['Webhook', 'A'], ['A', 'B']),
		});
		const res = buildNodesAttachment('w1', ['n1', 'n2', 'n3'], w);
		expect(res).not.toBeNull();
		expect(res!.truncated).toBe(false);
		expect(instanceAiNodesAttachmentSchema.safeParse(res!.attachment).success).toBe(true);
		expect(res!.attachment.sets).toHaveLength(1);
		expect(res!.attachment.sets[0].nodes.map((n) => n.name)).toEqual(['A', 'B', 'Lone']);
		expect(res!.attachment.sets[0].inputNode?.name).toBe('Webhook');
	});

	it('caps at 50 nodes-per-set and flags truncation', () => {
		const nodes = Array.from({ length: 60 }, (_, i) => ({ id: `n${i}`, name: `N${i}`, type: 't' }));
		const w = wf({ nodes, connections: {} });
		const res = buildNodesAttachment(
			'w1',
			nodes.map((n) => n.id),
			w,
		);
		expect(res!.truncated).toBe(true);
		expect(res!.attachment.sets).toHaveLength(1);
		expect(res!.attachment.sets[0].nodes.length).toBe(50);
		expect(instanceAiNodesAttachmentSchema.safeParse(res!.attachment).success).toBe(true);
	});

	it('a fully-grouped selection resolves to one set carrying the group', () => {
		// Caller passes EXPANDED member ids (n1, n2) — the group-chip case.
		const w = wf({
			nodes: [
				{ id: 'n1', name: 'Extract Fields', type: 't' },
				{ id: 'n2', name: 'Find Slack User', type: 't' },
			],
			connections: chain(['Extract Fields', 'Find Slack User']),
			groupsById: new Map([['g1', { id: 'g1', name: 'Prepare ticket' }]]),
			nodeIdToGroupId: new Map([
				['n1', 'g1'],
				['n2', 'g1'],
			]),
		});
		const res = buildNodesAttachment('w1', ['n1', 'n2'], w);
		expect(res!.attachment.sets).toHaveLength(1);
		expect(res!.attachment.sets[0].canvasGroupId).toBe('g1');
		expect(res!.attachment.sets[0].canvasGroupName).toBe('Prepare ticket');
		expect(instanceAiNodesAttachmentSchema.safeParse(res!.attachment).success).toBe(true);
	});

	it('drops a neighbor that names a node absent from workflow.nodes (orphan connection endpoint)', () => {
		const w = wf({ connections: chain(['Ghost', 'A'], ['A', 'B']) });
		const res = buildNodesAttachment('w1', ['n1', 'n2'], w);
		expect(instanceAiNodesAttachmentSchema.safeParse(res!.attachment).success).toBe(true);
		expect(res!.attachment.sets[0].inputNode).toBeUndefined();
	});
});

describe('mergeNodeSets', () => {
	const set = (n: string) => ({ nodes: [{ id: n }] });

	it('skips incoming sets already present by exact membership', () => {
		const merged = mergeNodeSets([set('A')], [set('A'), set('B')]);
		expect(merged).toEqual([set('A'), set('B')]);
	});

	it('caps the merged sets at the schema limit (50)', () => {
		const existing = Array.from({ length: 40 }, (_, i) => set(`e${i}`));
		const incoming = Array.from({ length: 40 }, (_, i) => set(`i${i}`));
		const merged = mergeNodeSets(existing, incoming);
		expect(merged).toHaveLength(50);
		expect(
			instanceAiNodesAttachmentSchema.safeParse({ type: 'nodes', workflowId: 'w1', sets: merged })
				.success,
		).toBe(true);
	});
});
