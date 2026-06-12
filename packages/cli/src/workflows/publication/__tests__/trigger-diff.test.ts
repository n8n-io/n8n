import type { INode } from 'n8n-workflow';

import { computeTriggerDiff } from '@/workflows/publication/trigger-diff';

describe('computeTriggerDiff', () => {
	function makeNode(id: string, overrides: Partial<INode> = {}): INode {
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
		const a = makeNode('a');

		const diff = computeTriggerDiff([a], [{ ...a }]);

		expect(diff).toEqual({ toAdd: new Set(), toRemove: new Set() });
	});

	test('detects added triggers', () => {
		const diff = computeTriggerDiff([makeNode('a')], [makeNode('a'), makeNode('b')]);

		expect(diff).toEqual({ toAdd: new Set(['b']), toRemove: new Set() });
	});

	test('detects removed triggers', () => {
		const diff = computeTriggerDiff([makeNode('a'), makeNode('b')], [makeNode('a')]);

		expect(diff).toEqual({ toAdd: new Set(), toRemove: new Set(['b']) });
	});

	test('treats a parameter change as a modification (remove-then-add)', () => {
		const before = makeNode('a', { parameters: { interval: 1 } });
		const after = makeNode('a', { parameters: { interval: 5 } });

		const diff = computeTriggerDiff([before], [after]);

		expect(diff).toEqual({ toAdd: new Set(['a']), toRemove: new Set(['a']) });
	});

	test('treats a typeVersion change as a modification', () => {
		const diff = computeTriggerDiff(
			[makeNode('a', { typeVersion: 1 })],
			[makeNode('a', { typeVersion: 2 })],
		);

		expect(diff).toEqual({ toAdd: new Set(['a']), toRemove: new Set(['a']) });
	});

	test('handles a mix of added, removed, modified and unchanged triggers', () => {
		const unchanged = makeNode('unchanged');
		const removed = makeNode('removed');
		const modifiedBefore = makeNode('modified', { parameters: { value: 1 } });
		const modifiedAfter = makeNode('modified', { parameters: { value: 2 } });
		const added = makeNode('added');

		const diff = computeTriggerDiff(
			[unchanged, removed, modifiedBefore],
			[{ ...unchanged }, modifiedAfter, added],
		);

		expect(Array.from(diff.toAdd).sort()).toEqual(['added', 'modified']);
		expect(Array.from(diff.toRemove).sort()).toEqual(['modified', 'removed']);
	});

	test('returns empty diff for two empty trigger sets', () => {
		expect(computeTriggerDiff([], [])).toEqual({ toAdd: new Set(), toRemove: new Set() });
	});
});
