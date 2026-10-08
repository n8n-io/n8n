import { afterEach, describe, expect, it } from 'vitest';
import { CHAT_GROUP_ATTRIBUTE, focusAnchor, focusTarget } from '../useKeepGroupFocus';

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
