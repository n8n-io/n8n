import { afterEach, describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { CHAT_GROUP_ATTRIBUTE, focusAnchor, focusTarget } from '../useKeepGroupFocus';

const GROUP_NAMES = ['needs-you', 'working', 'ready', 'done'];

/** A grouped chat list: each group has a heading, its chat rows and a "Show all" button. */
function groupedList(groups: Record<string, string[]>) {
	const root = document.createElement('div');
	for (const [group, rowIds] of Object.entries(groups)) {
		const element = document.createElement('div');
		element.setAttribute(CHAT_GROUP_ATTRIBUTE, group);
		element.innerHTML = [
			`<div role="heading">${group}</div>`,
			...rowIds.map((id) => `<a id="${id}" role="menuitem" href="#">${id}</a>`),
			'<button type="button">Show all</button>',
		].join('');
		root.appendChild(element);
	}
	document.body.appendChild(root);
	return root;
}

function row(root: HTMLElement, id: string) {
	const element = root.querySelector<HTMLElement>(`[id="${id}"]`);
	if (!element) throw new Error(`no row ${id}`);
	return element;
}

describe('useKeepGroupFocus helpers', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	describe('focusAnchor', () => {
		it('names the focused row and its group', () => {
			const root = groupedList({ working: ['a'], done: ['b'] });
			row(root, 'b').focus();

			expect(focusAnchor(root)).toEqual({ rowId: 'b', group: 'done' });
		});

		it('names only the group for a focused button', () => {
			const root = groupedList({ done: ['b'] });
			root.querySelector('button')?.focus();

			expect(focusAnchor(root)).toEqual({ rowId: undefined, group: 'done' });
		});

		it('returns nothing when the focus is outside the list', () => {
			const root = groupedList({ done: ['b'] });
			const outside = document.createElement('button');
			document.body.appendChild(outside);
			outside.focus();

			expect(focusAnchor(root)).toBeUndefined();
		});
	});

	describe('focusTarget', () => {
		/** Groups in the fixed order, some without rows, and row IDs that are unique in the list. */
		const listArb = fc
			.record({
				groups: fc.subarray(GROUP_NAMES),
				rows: fc.uniqueArray(fc.tuple(fc.integer({ min: 0, max: 15 }), fc.nat()), {
					selector: ([id]) => id,
					maxLength: 12,
				}),
			})
			.map(({ groups, rows }) => {
				const list: Record<string, string[]> = Object.fromEntries(groups.map((g) => [g, []]));
				if (groups.length > 0) {
					for (const [id, slot] of rows) list[groups[slot % groups.length]].push(`r${id}`);
				}
				return list;
			});
		const anchorArb = fc.record({
			rowId: fc.option(
				fc.integer({ min: 0, max: 15 }).map((id) => `r${id}`),
				{ nil: undefined },
			),
			group: fc.option(fc.constantFrom(...GROUP_NAMES, 'other'), { nil: undefined }),
		});

		it('returns a row of the new list when the list has one, and the same chat when it is listed', () => {
			fc.assert(
				fc.property(listArb, anchorArb, (list, anchor) => {
					const root = groupedList(list);
					try {
						const rows = Array.from(root.querySelectorAll<HTMLElement>('[role="menuitem"]'));
						const groupRows = anchor.group === undefined ? [] : (list[anchor.group] ?? []);
						const expectedId = rows.some((r) => r.id === anchor.rowId)
							? anchor.rowId
							: (groupRows.at(-1) ?? rows[0]?.id);

						const target = focusTarget(root, anchor);

						if (rows.length === 0) expect(target).toBeUndefined();
						else expect(rows).toContain(target);
						expect(target?.id).toBe(expectedId);
					} finally {
						root.remove();
					}
				}),
			);
		});

		it('finds the same chat in another group', () => {
			const root = groupedList({ working: ['a'], done: ['b', 'c'] });

			expect(focusTarget(root, { rowId: 'c', group: 'working' })).toBe(row(root, 'c'));
		});

		it('takes the last row of the group when the chat is gone', () => {
			const root = groupedList({ working: ['a', 'd'], done: ['b', 'c'] });

			expect(focusTarget(root, { rowId: 'gone', group: 'working' })).toBe(row(root, 'd'));
		});

		it('takes the last row of the group for a button that is gone', () => {
			const root = groupedList({ working: ['a'], done: ['b', 'c'] });

			expect(focusTarget(root, { group: 'done' })).toBe(row(root, 'c'));
		});

		it('takes the first row of the list when the group is gone', () => {
			const root = groupedList({ working: ['a'], done: ['b'] });

			expect(focusTarget(root, { rowId: 'gone', group: 'needs-you' })).toBe(row(root, 'a'));
		});

		it('takes the first row of the list when the group has no rows left', () => {
			const root = groupedList({ working: ['a'], done: [] });

			expect(focusTarget(root, { group: 'done' })).toBe(row(root, 'a'));
		});

		it('returns nothing for an empty list', () => {
			const root = groupedList({});

			expect(focusTarget(root, { rowId: 'a', group: 'done' })).toBeUndefined();
		});
	});
});
