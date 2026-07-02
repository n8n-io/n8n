import userEvent from '@testing-library/user-event';
import { fireEvent, render, waitFor } from '@testing-library/vue';
import { vi } from 'vitest';
import { h } from 'vue';

import { useDropdownSearch } from './composables/useDropdownSearch';
import type { DropdownMenuItemProps } from './DropdownMenu.types';
import {
	getItemDomId,
	getNextValidIndex,
	hasSubMenu,
	isInputCursorAtEnd,
	isInputCursorAtStart,
} from './DropdownMenu.utils';
import DropdownMenuSearchableContent from './DropdownMenuSearchableContent.vue';

const createItems = (count: number, disabledIndices: number[] = []): DropdownMenuItemProps[] => {
	return Array.from({ length: count }, (_, i) => ({
		id: `item-${i}`,
		label: `Item ${i}`,
		disabled: disabledIndices.includes(i),
	}));
};

describe('DropdownMenu utils', () => {
	describe('getNextValidIndex', () => {
		it('should return first item when navigating down from initial state', () => {
			expect(getNextValidIndex(createItems(3), -1, 1)).toBe(0);
		});

		it('should move to next item when navigating down', () => {
			expect(getNextValidIndex(createItems(3), 0, 1)).toBe(1);
		});

		it('should not move past last item when navigating down', () => {
			expect(getNextValidIndex(createItems(3), 2, 1)).toBe(2);
		});

		it('should skip disabled items when navigating down', () => {
			expect(getNextValidIndex(createItems(4, [1]), 0, 1)).toBe(2);
		});

		it('should skip multiple consecutive disabled items when navigating down', () => {
			expect(getNextValidIndex(createItems(5, [1, 2]), 0, 1)).toBe(3);
		});

		it('should skip disabled first item when navigating down from initial state', () => {
			expect(getNextValidIndex(createItems(3, [0]), -1, 1)).toBe(1);
		});

		it('should move to previous item when navigating up', () => {
			expect(getNextValidIndex(createItems(3), 2, -1)).toBe(1);
		});

		it('should skip disabled items when navigating up', () => {
			expect(getNextValidIndex(createItems(4, [1]), 2, -1)).toBe(0);
		});

		it('should return -1 when all items above are disabled', () => {
			expect(getNextValidIndex(createItems(3, [0]), 1, -1)).toBe(-1);
		});
	});

	describe('hasSubMenu', () => {
		it('should detect children, loading, and searchable submenus', () => {
			expect(hasSubMenu({ id: 'children', label: 'Children', children: createItems(1) })).toBe(
				true,
			);
			expect(hasSubMenu({ id: 'loading', label: 'Loading', loading: true })).toBe(true);
			expect(hasSubMenu({ id: 'searchable', label: 'Searchable', searchable: true })).toBe(true);
		});

		it('should return false without submenu indicators', () => {
			expect(hasSubMenu({ id: 'item', label: 'Item' })).toBe(false);
			expect(hasSubMenu({ id: 'empty-children', label: 'Empty children', children: [] })).toBe(
				false,
			);
		});
	});

	it('should build deterministic item DOM ids', () => {
		expect(getItemDomId('abc', 2)).toBe('dropdown-menu-searchable-abc-item-2');
	});

	describe('input cursor helpers', () => {
		it('should detect whether the input cursor is at the start or end', () => {
			const input = document.createElement('input');
			input.value = 'test';
			document.body.appendChild(input);
			input.focus();
			input.setSelectionRange(0, 0);

			const startEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
			input.dispatchEvent(startEvent);

			expect(isInputCursorAtStart(startEvent)).toBe(true);
			expect(isInputCursorAtEnd(startEvent)).toBe(false);

			input.setSelectionRange(4, 4);
			const endEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
			input.dispatchEvent(endEvent);

			expect(isInputCursorAtStart(endEvent)).toBe(false);
			expect(isInputCursorAtEnd(endEvent)).toBe(true);

			input.remove();
		});
	});
});

type SearchableSlotProps = {
	highlightedIndex: number;
	openSubMenuIndex: number;
	onItemHover: (index: number) => void;
	onSubMenuOpenChange: (index: number, open: boolean) => void;
	getItemDomId: (index: number) => string;
};

const renderSearchableContent = (
	items: DropdownMenuItemProps[],
	open = true,
	pointerOpensSubmenus = false,
	searchDebounce = 0,
) => {
	return render(DropdownMenuSearchableContent, {
		props: { open, items, searchDebounce },
		slots: {
			default: ({
				highlightedIndex,
				openSubMenuIndex,
				onItemHover,
				onSubMenuOpenChange,
				getItemDomId,
			}: SearchableSlotProps) =>
				h(
					'div',
					{ 'data-menu-items': '', 'data-open-submenu-index': openSubMenuIndex },
					items.map((item, index) =>
						h(
							'button',
							{
								id: getItemDomId(index),
								'aria-selected': highlightedIndex === index ? 'true' : undefined,
								onPointermove: (event: PointerEvent) => {
									(event.currentTarget as HTMLButtonElement).focus();
									onItemHover(index);
									if (pointerOpensSubmenus && item.children) {
										onSubMenuOpenChange(index, true);
									}
								},
							},
							item.label,
						),
					),
				),
		},
	});
};

describe('useDropdownSearch', () => {
	it('should not fall back to unfiltered children when parent matches', () => {
		const { filteredItems, handleSearch } = useDropdownSearch(
			[
				{
					id: 'parent',
					label: 'Parent',
					children: [
						{ id: 'child', label: 'Child' },
						{ id: 'other', label: 'Other' },
					],
				},
			],
			{ includeChildrenWhenParentMatches: false },
		);

		handleSearch('parent');

		expect(filteredItems.value).toEqual([{ id: 'parent', label: 'Parent', children: [] }]);
	});
});

describe('DropdownMenuSearchableContent keyboard navigation', () => {
	it('should highlight the first enabled item when pressing ArrowDown', async () => {
		const wrapper = renderSearchableContent(createItems(3, [0]));

		await userEvent.click(wrapper.getByRole('textbox'));
		await userEvent.keyboard('{ArrowDown}');

		await waitFor(() => {
			expect(wrapper.getByText('Item 1')).toHaveAttribute('aria-selected', 'true');
		});
	});

	it('should keep the first item highlighted when pressing ArrowUp from index 0', async () => {
		const wrapper = renderSearchableContent(createItems(2));

		await userEvent.click(wrapper.getByRole('textbox'));
		await userEvent.keyboard('{ArrowDown}');

		await waitFor(() => {
			expect(wrapper.getByText('Item 0')).toHaveAttribute('aria-selected', 'true');
		});

		await userEvent.keyboard('{ArrowUp}');

		expect(wrapper.getByText('Item 0')).toHaveAttribute('aria-selected', 'true');
	});

	it('should select the highlighted item and close when pressing Enter', async () => {
		const wrapper = renderSearchableContent(createItems(2));

		await userEvent.click(wrapper.getByRole('textbox'));
		await userEvent.keyboard('{ArrowDown}{Enter}');

		await waitFor(() => {
			expect(wrapper.emitted('select')?.[0]).toEqual(['item-0']);
			expect(wrapper.emitted('close')).toBeTruthy();
		});
	});

	it('should open the highlighted submenu instead of selecting it when pressing Enter', async () => {
		const wrapper = renderSearchableContent([
			{ id: 'parent', label: 'Parent', children: createItems(1) },
			{ id: 'item-1', label: 'Item 1' },
		]);

		await userEvent.click(wrapper.getByRole('textbox'));
		await userEvent.keyboard('{ArrowDown}{Enter}');

		await waitFor(() => {
			expect(wrapper.container.querySelector('[data-open-submenu-index]')).toHaveAttribute(
				'data-open-submenu-index',
				'0',
			);
			expect(wrapper.emitted('submenu:toggle')?.at(-1)).toEqual(['parent', true]);
			expect(wrapper.emitted('select')).toBeUndefined();
		});
	});

	it('should refocus the search input after hovering an item', async () => {
		const wrapper = renderSearchableContent([
			{ id: 'item-0', label: 'Item 0' },
			{ id: 'parent', label: 'Parent', children: createItems(1) },
		]);
		const input = wrapper.getByRole('textbox');

		await userEvent.click(input);
		await fireEvent.pointerMove(wrapper.getByText('Parent'));

		expect(wrapper.getByText('Parent')).toHaveAttribute('aria-selected', 'true');
		await waitFor(() => expect(document.activeElement).toBe(input));
	});

	it('should leave submenu open state unchanged when hovering another item', async () => {
		const wrapper = renderSearchableContent([
			{ id: 'parent', label: 'Parent', children: createItems(1) },
			{ id: 'item-1', label: 'Item 1' },
		]);

		await userEvent.click(wrapper.getByRole('textbox'));
		await userEvent.keyboard('{ArrowDown}{Enter}');
		await fireEvent.pointerMove(wrapper.getByText('Item 1'));

		expect(wrapper.container.querySelector('[data-open-submenu-index]')).toHaveAttribute(
			'data-open-submenu-index',
			'0',
		);
		expect(wrapper.getByText('Item 1')).toHaveAttribute('aria-selected', 'true');
	});

	it('should close a pointer-opened submenu when navigating with ArrowDown', async () => {
		const wrapper = renderSearchableContent(
			[
				{ id: 'parent', label: 'Parent', children: createItems(1) },
				{ id: 'item-1', label: 'Item 1' },
			],
			true,
			true,
		);

		await userEvent.click(wrapper.getByRole('textbox'));
		await fireEvent.pointerMove(wrapper.getByText('Parent'));

		expect(wrapper.container.querySelector('[data-open-submenu-index]')).toHaveAttribute(
			'data-open-submenu-index',
			'0',
		);

		await userEvent.keyboard('{ArrowDown}');

		expect(wrapper.container.querySelector('[data-open-submenu-index]')).toHaveAttribute(
			'data-open-submenu-index',
			'-1',
		);
		expect(wrapper.getByText('Parent')).toHaveAttribute('aria-selected', 'true');
	});

	it('should close when pressing Escape or Tab', async () => {
		const wrapper = renderSearchableContent(createItems(2));

		await userEvent.click(wrapper.getByRole('textbox'));
		await userEvent.keyboard('{Escape}{Tab}');

		expect(wrapper.emitted('close')).toHaveLength(2);
	});

	it('should keep focus on the search input after keyboard navigation with a search query', async () => {
		const wrapper = renderSearchableContent(createItems(2));
		const input = wrapper.getByRole('textbox');

		await userEvent.type(input, 'Item');
		await userEvent.keyboard('{ArrowDown}');

		await waitFor(() => expect(document.activeElement).toBe(input));
	});

	it('should wire aria-activedescendant to the highlighted item', async () => {
		const wrapper = renderSearchableContent(createItems(2));
		const input = wrapper.getByRole('textbox');

		await userEvent.click(input);
		await userEvent.keyboard('{ArrowDown}');

		await waitFor(() => {
			const activeDescendant = input.getAttribute('aria-activedescendant');
			expect(activeDescendant).toBeTruthy();
			expect(document.getElementById(activeDescendant ?? '')).toHaveTextContent('Item 0');
			expect(document.getElementById(activeDescendant ?? '')).toHaveAttribute(
				'aria-selected',
				'true',
			);
		});
	});

	it('should open a highlighted submenu with ArrowRight only when the cursor is at the end', async () => {
		const wrapper = renderSearchableContent([
			{ id: 'parent', label: 'Parent', children: createItems(1) },
		]);
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- Needed for typecheck when calling setSelectionRange
		const input = wrapper.getByRole('textbox') as HTMLInputElement;

		await userEvent.type(input, 'ab');
		await userEvent.keyboard('{ArrowDown}');
		input.setSelectionRange(1, 1);
		await userEvent.keyboard('{ArrowRight}');

		expect(wrapper.container.querySelector('[data-open-submenu-index]')).toHaveAttribute(
			'data-open-submenu-index',
			'-1',
		);

		input.setSelectionRange(2, 2);
		await userEvent.keyboard('{ArrowRight}');

		expect(wrapper.container.querySelector('[data-open-submenu-index]')).toHaveAttribute(
			'data-open-submenu-index',
			'0',
		);
	});

	it('should close an open submenu with ArrowLeft only when the cursor is at the start', async () => {
		const wrapper = renderSearchableContent([
			{ id: 'parent', label: 'Parent', children: createItems(1) },
		]);

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- Needed for typecheck when calling setSelectionRange
		const input = wrapper.getByRole('textbox') as HTMLInputElement;

		await userEvent.type(input, 'ab');
		await userEvent.keyboard('{ArrowDown}');
		input.setSelectionRange(2, 2);
		await userEvent.keyboard('{ArrowRight}');

		expect(wrapper.container.querySelector('[data-open-submenu-index]')).toHaveAttribute(
			'data-open-submenu-index',
			'0',
		);

		input.setSelectionRange(1, 1);
		await userEvent.keyboard('{ArrowLeft}');
		expect(wrapper.container.querySelector('[data-open-submenu-index]')).toHaveAttribute(
			'data-open-submenu-index',
			'0',
		);

		input.setSelectionRange(0, 0);
		await userEvent.keyboard('{ArrowLeft}');
		expect(wrapper.container.querySelector('[data-open-submenu-index]')).toHaveAttribute(
			'data-open-submenu-index',
			'-1',
		);
	});

	it('should emit search updates and reset search when closed', async () => {
		const items = createItems(2);
		const wrapper = renderSearchableContent(items);

		await userEvent.type(wrapper.getByRole('textbox'), 'test');

		await waitFor(() => {
			expect(wrapper.emitted('search')?.at(-1)).toEqual(['test']);
		});

		await wrapper.rerender({ open: false, items, searchDebounce: 0 });

		expect(wrapper.getByRole('textbox')).toHaveValue('');
		expect(wrapper.emitted('search')?.at(-1)).toEqual(['']);
	});

	it('should ignore pending debounced search after resetting search on close', async () => {
		vi.useFakeTimers();
		try {
			const items = createItems(2);
			const wrapper = renderSearchableContent(items, true, false, 100);

			await userEvent.type(wrapper.getByRole('textbox'), 'test', {
				advanceTimers: vi.advanceTimersByTime,
			});
			await wrapper.rerender({ open: false, items, searchDebounce: 100 });
			await vi.advanceTimersByTimeAsync(100);

			expect(wrapper.emitted('search')).toEqual([['']]);
		} finally {
			vi.useRealTimers();
		}
	});

	it('should keep the highlighted item when the items array changes and the item still exists', async () => {
		const items = createItems(4);
		const wrapper = renderSearchableContent(items);

		await userEvent.click(wrapper.getByRole('textbox'));
		await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');

		await waitFor(() => {
			expect(wrapper.getByText('Item 2')).toHaveAttribute('aria-selected', 'true');
		});

		await wrapper.rerender({ open: true, items: createItems(4), searchDebounce: 0 });
		await userEvent.keyboard('{ArrowDown}');

		expect(wrapper.getByText('Item 3')).toHaveAttribute('aria-selected', 'true');
	});

	it('should reset the highlighted item when items change and the highlighted item no longer exists', async () => {
		const items = createItems(2);
		const wrapper = renderSearchableContent(items);

		await userEvent.click(wrapper.getByRole('textbox'));
		await userEvent.keyboard('{ArrowDown}');

		await waitFor(() => {
			expect(wrapper.getByText('Item 0')).toHaveAttribute('aria-selected', 'true');
		});

		await wrapper.rerender({
			open: true,
			items: [{ id: 'item-1', label: 'Item 1' }],
			searchDebounce: 0,
		});

		expect(wrapper.getByText('Item 1')).not.toHaveAttribute('aria-selected');
	});
});
