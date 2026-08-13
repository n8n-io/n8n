import { describe, it, expect } from 'vitest';
import type { IConnections } from 'n8n-workflow';
import {
	partitionSelectionIntoSets,
	resolveSetNeighbors,
	resolveSetCanvasGroup,
} from './buildNodesAttachment';
import type { BuilderWorkflow } from './buildNodesAttachment';

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
			groupsById: new Map([['g1', { id: 'g1', name: 'My Group 1', nodeIds: ['n1', 'n2'] }]]),
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
});
