import type { INode } from 'n8n-workflow';

import { computeTriggerDiff } from '@/workflows/trigger-diff';

describe('computeTriggerDiff', () => {
	function node(id: string, overrides: Partial<INode> = {}): INode {
		return {
			id,
			name: id,
			type: 'n8n-nodes-base.scheduleTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			...overrides,
		};
	}

	test('returns empty diff when trigger sets are identical', () => {
		const a = node('a');

		const diff = computeTriggerDiff([a], [{ ...a }]);

		expect(diff).toEqual({ toAdd: [], toRemove: [] });
	});

	test('detects added triggers', () => {
		const diff = computeTriggerDiff([node('a')], [node('a'), node('b')]);

		expect(diff).toEqual({ toAdd: ['b'], toRemove: [] });
	});

	test('detects removed triggers', () => {
		const diff = computeTriggerDiff([node('a'), node('b')], [node('a')]);

		expect(diff).toEqual({ toAdd: [], toRemove: ['b'] });
	});

	test('treats a parameter change as a modification (remove-then-add)', () => {
		const before = node('a', { parameters: { interval: 1 } });
		const after = node('a', { parameters: { interval: 5 } });

		const diff = computeTriggerDiff([before], [after]);

		expect(diff).toEqual({ toAdd: ['a'], toRemove: ['a'] });
	});

	test('treats a typeVersion change as a modification', () => {
		const diff = computeTriggerDiff(
			[node('a', { typeVersion: 1 })],
			[node('a', { typeVersion: 2 })],
		);

		expect(diff).toEqual({ toAdd: ['a'], toRemove: ['a'] });
	});

	test('handles a mix of added, removed, modified and unchanged triggers', () => {
		const unchanged = node('unchanged');
		const removed = node('removed');
		const modifiedBefore = node('modified', { parameters: { value: 1 } });
		const modifiedAfter = node('modified', { parameters: { value: 2 } });
		const added = node('added');

		const diff = computeTriggerDiff(
			[unchanged, removed, modifiedBefore],
			[{ ...unchanged }, modifiedAfter, added],
		);

		expect(diff.toAdd.sort()).toEqual(['added', 'modified']);
		expect(diff.toRemove.sort()).toEqual(['modified', 'removed']);
	});

	test('returns empty diff for two empty trigger sets', () => {
		expect(computeTriggerDiff([], [])).toEqual({ toAdd: [], toRemove: [] });
	});
});
