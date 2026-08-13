import { describe, it, expect } from 'vitest';
import type { IConnections } from 'n8n-workflow';
import { partitionSelectionIntoSets } from './buildNodesAttachment';

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
