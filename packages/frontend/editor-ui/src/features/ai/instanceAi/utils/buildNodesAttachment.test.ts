import { describe, it, expect } from 'vitest';
import type { IConnections } from 'n8n-workflow';
import {
	partitionSelectionIntoSets,
	resolveSetNeighbors,
	resolveSetCanvasGroup,
	buildNodesAttachment,
} from './buildNodesAttachment';
import type { BuilderWorkflow } from './buildNodesAttachment';
import { instanceAiNodesAttachmentSchema } from '@n8n/api-types';

function wf(over: Partial<BuilderWorkflow> = {}): BuilderWorkflow {
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

// Helpers: build a name-keyed IConnections for simple main-type chains.
function chain(...pairs: Array<[string, string]>): IConnections {
	const c: IConnections = {};
	for (const [from, to] of pairs) {
		c[from] ??= { main: [[]] };
		(c[from].main[0] ??= []).push({ node: to, type: 'main', index: 0 });
	}
	return c;
}

describe('partitionSelectionIntoSets', () => {
	it('groups a fully-connected selected chain into one ordered set', () => {
		const conns = chain(['A', 'B'], ['B', 'C']);
		const sets = partitionSelectionIntoSets(['A', 'B', 'C'], conns);
		expect(sets).toHaveLength(1);
		expect(sets[0].nodeNames).toEqual(['A', 'B', 'C']);
	});

	it('splits two unconnected selected nodes into two sets', () => {
		const conns = chain(['A', 'X'], ['X', 'B']); // X is NOT selected
		const sets = partitionSelectionIntoSets(['A', 'B'], conns);
		expect(sets).toHaveLength(2);
		expect(
			sets
				.map((s) => s.nodeNames)
				.flat()
				.sort(),
		).toEqual(['A', 'B']);
	});

	it('keeps a trigger + terminal in one set when connected through selected nodes', () => {
		const conns = chain(['Trigger', 'Mid'], ['Mid', 'Out']);
		const sets = partitionSelectionIntoSets(['Trigger', 'Mid', 'Out'], conns);
		expect(sets).toHaveLength(1);
		expect(sets[0].nodeNames).toEqual(['Trigger', 'Mid', 'Out']);
	});

	it('folds a sub-node (non-main connection) into its parent set, not a separate one', () => {
		// Model —ai_languageModel→ Agent, plus a main chain Trigger → Agent.
		const conns: IConnections = {
			Trigger: { main: [[{ node: 'Agent', type: 'main', index: 0 }]] },
			Model: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
		};
		const sets = partitionSelectionIntoSets(['Trigger', 'Agent', 'Model'], conns);
		expect(sets).toHaveLength(1);
		expect(sets[0].nodeNames.slice().sort()).toEqual(['Agent', 'Model', 'Trigger']);
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

	it('builds a schema-valid attachment for a chain + a lone node', () => {
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
		const setA = res!.attachment.sets.find((s) => s.nodes.length === 2)!;
		expect(setA.nodes.map((n) => n.name)).toEqual(['A', 'B']);
		expect(setA.inputNode?.name).toBe('Webhook');
	});

	it('caps at 50 sets and 50 nodes-per-set and flags truncation', () => {
		const nodes = Array.from({ length: 60 }, (_, i) => ({ id: `n${i}`, name: `N${i}`, type: 't' }));
		// 60 lone (unconnected) selected nodes → 60 sets → capped to 50.
		const w = wf({ nodes, connections: {} });
		const res = buildNodesAttachment(
			'w1',
			nodes.map((n) => n.id),
			w,
		);
		expect(res!.truncated).toBe(true);
		expect(res!.attachment.sets.length).toBe(50);
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
		// "Ghost" is a connection endpoint but not in workflow.nodes — an orphan.
		const w = wf({ connections: chain(['Ghost', 'A'], ['A', 'B']) });
		const res = buildNodesAttachment('w1', ['n1', 'n2'], w);
		expect(instanceAiNodesAttachmentSchema.safeParse(res!.attachment).success).toBe(true);
		expect(res!.attachment.sets[0].inputNode).toBeUndefined();
	});
});
