import { afterEach, describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { FOCUS_ROW_ATTRIBUTE, rowFocusAnchor, rowFocusTarget } from '../useKeepListFocus';

/** A flat list: a toggle above the rows, and each row has a link and an "Open chat" button. */
function flatList(keys: readonly string[]) {
	const root = document.createElement('div');
	const toggle = document.createElement('button');
	toggle.textContent = 'Toggle';
	root.appendChild(toggle);
	for (const key of keys) {
		const row = document.createElement('div');
		row.setAttribute(FOCUS_ROW_ATTRIBUTE, key);
		const link = document.createElement('a');
		link.setAttribute('role', 'menuitem');
		link.setAttribute('href', '#');
		link.textContent = key;
		const button = document.createElement('button');
		button.textContent = `Open chat for ${key}`;
		row.append(link, button);
		root.appendChild(row);
	}
	document.body.appendChild(root);
	return root;
}

function rowOf(root: HTMLElement, key: string) {
	const row = Array.from(root.querySelectorAll(`[${FOCUS_ROW_ATTRIBUTE}]`)).find(
		(element) => element.getAttribute(FOCUS_ROW_ATTRIBUTE) === key,
	);
	if (!row) throw new Error(`no row ${key}`);
	return row;
}

const linkOf = (root: HTMLElement, key: string) => rowOf(root, key).querySelector('a');
const buttonOf = (root: HTMLElement, key: string) => rowOf(root, key).querySelector('button');

describe('useKeepListFocus helpers', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	describe('rowFocusAnchor', () => {
		it('names the key and the position of the row that holds the focus', () => {
			const root = flatList(['a', 'b', 'c']);
			buttonOf(root, 'c')?.focus();

			expect(rowFocusAnchor(root)).toEqual({ key: 'c', index: 2 });
		});

		it('returns nothing when the focus is in the list but not in a row', () => {
			const root = flatList(['a']);
			root.querySelector('button')?.focus();

			expect(rowFocusAnchor(root)).toBeUndefined();
		});

		it('returns nothing when the focus is outside the list', () => {
			const root = flatList(['a']);
			const outside = flatList(['a']);
			linkOf(outside, 'a')?.focus();

			expect(rowFocusAnchor(root)).toBeUndefined();
		});

		it('ignores a row around the list when the focus is not in a row of the list', () => {
			const outer = flatList(['outer']);
			const root = flatList(['a']);
			rowOf(outer, 'outer').appendChild(root);
			root.querySelector('button')?.focus();

			expect(rowFocusAnchor(root)).toBeUndefined();
		});
	});

	describe('rowFocusTarget', () => {
		it('finds the link of the same row at its new position', () => {
			const root = flatList(['new', 'a', 'b']);

			expect(rowFocusTarget(root, { key: 'a', index: 0 })).toBe(linkOf(root, 'a'));
		});

		it('takes the row that now has the same position when the row is gone', () => {
			const root = flatList(['a', 'c', 'd']);

			expect(rowFocusTarget(root, { key: 'b', index: 1 })).toBe(linkOf(root, 'c'));
		});

		it('takes the first row when the first row is gone', () => {
			const root = flatList(['b', 'c']);

			expect(rowFocusTarget(root, { key: 'a', index: 0 })).toBe(linkOf(root, 'b'));
		});

		it('takes the last row when the list got shorter than the position', () => {
			const root = flatList(['a', 'b']);

			expect(rowFocusTarget(root, { key: 'e', index: 4 })).toBe(linkOf(root, 'b'));
		});

		it('returns nothing when no row is left', () => {
			const root = flatList([]);

			expect(rowFocusTarget(root, { key: 'a', index: 0 })).toBeUndefined();
		});
	});

	it('always gives the focus to a link of the new list, and keeps the same row when it stays', () => {
		const key = fc.integer({ min: 0, max: 30 }).map(String);
		const scenario = fc
			.record({
				before: fc.uniqueArray(key, { minLength: 1, maxLength: 8 }),
				after: fc.uniqueArray(key, { maxLength: 8 }),
			})
			.chain(({ before, after }) =>
				fc.record({
					before: fc.constant(before),
					after: fc.constant(after),
					focused: fc.integer({ min: 0, max: before.length - 1 }),
				}),
			);

		fc.assert(
			fc.property(scenario, ({ before, after, focused }) => {
				document.body.innerHTML = '';
				const oldList = flatList(before);
				buttonOf(oldList, before[focused])?.focus();
				const anchor = rowFocusAnchor(oldList);
				expect(anchor).toEqual({ key: before[focused], index: focused });
				if (!anchor) return;
				const newList = flatList(after);

				const target = rowFocusTarget(newList, anchor);

				if (after.length === 0) {
					expect(target).toBeUndefined();
				} else if (after.includes(anchor.key)) {
					expect(target).toBe(linkOf(newList, anchor.key));
				} else {
					// The focus stays where it was, or moves up to the last row of a shorter list.
					const position = Math.min(focused, after.length - 1);
					expect(target).toBe(linkOf(newList, after[position]));
				}
			}),
		);
	});
});
