import { describe, expect, it } from 'vitest';
import { groupActivityItems, isToolGroupLoading } from './groupActivityItems';
import type { AiActivityItem, AiActivityToolGroupItem, AiActivityToolItem } from './types';

function tool(id: string, overrides: Partial<AiActivityToolItem<string>> = {}) {
	return {
		kind: 'tool',
		id,
		label: id,
		payload: id,
		...overrides,
	} satisfies AiActivityToolItem<string>;
}

describe('groupActivityItems', () => {
	it('keeps a single tool call as a row', () => {
		const items: Array<AiActivityItem<string>> = [tool('a')];

		expect(groupActivityItems(items)).toEqual(items);
	});

	it('groups adjacent tool calls', () => {
		const grouped = groupActivityItems<string>([tool('a'), tool('b')]);

		expect(grouped).toHaveLength(1);
		expect(grouped[0]).toMatchObject({ kind: 'tools', id: 'tools-a' });
		expect((grouped[0] as AiActivityToolGroupItem<string>).items.map((item) => item.id)).toEqual([
			'a',
			'b',
		]);
	});

	it('starts a new group after a row that is not a tool call', () => {
		const grouped = groupActivityItems<string>([
			{ kind: 'thinking', id: 'thinking', segments: [], active: false },
			tool('a'),
			tool('b'),
			{ kind: 'step', id: 'context', label: 'Read context' },
			tool('c'),
		]);

		expect(grouped.map((item) => item.kind)).toEqual(['thinking', 'tools', 'step', 'tool']);
	});
});

describe('isToolGroupLoading', () => {
	it('is true while a call runs', () => {
		const group: AiActivityToolGroupItem<string> = {
			kind: 'tools',
			id: 'g',
			items: [tool('a'), tool('b', { loading: true })],
		};

		expect(isToolGroupLoading(group)).toBe(true);
	});

	it('ignores a call that waits', () => {
		const group: AiActivityToolGroupItem<string> = {
			kind: 'tools',
			id: 'g',
			items: [tool('a'), tool('b', { loading: true, waiting: true })],
		};

		expect(isToolGroupLoading(group)).toBe(false);
	});
});
