import { useIntersectionObserver } from '@n8n/composables/useIntersectionObserver';
import userEvent from '@testing-library/user-event';
import { fireEvent, render, waitFor } from '@testing-library/vue';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import type { VersionHistoryEntry, VersionHistoryItem } from './VersionHistory.types';
import N8nVersionHistory from './VersionHistory.vue';

// The composable creates a real IntersectionObserver. jsdom does not provide one.
const { observe } = vi.hoisted(() => ({
	observe: vi.fn(),
}));

vi.mock('@n8n/composables/useIntersectionObserver', () => ({
	useIntersectionObserver: vi.fn(() => ({
		observe,
		disconnect: vi.fn(),
	})),
}));

const items: VersionHistoryItem[] = [
	{
		id: 'v2',
		label: 'v2',
		detail: 'Latest',
		author: 'Alex',
		createdAt: 'Oct 28 at 09:14',
		status: 'latest',
		statusLabel: 'Latest version',
		actions: [{ id: 'restore', label: 'Restore', icon: 'undo-2' }],
	},
	{
		id: 'v1',
		label: 'v1',
		detail: 'In published agent',
		author: 'Alex',
		createdAt: 'Oct 24 at 14:28',
		status: 'published',
		statusLabel: 'Published version',
		compareDisabled: true,
		actions: [{ id: 'unpublish', label: 'Unpublish' }],
	},
];

function renderHistory(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
	return render(N8nVersionHistory, {
		props: { items, ...props },
		slots,
	});
}

describe('N8nVersionHistory', () => {
	it('renders a version row with its detail and time', () => {
		const { getByRole, getAllByRole, getByTestId, queryByRole } = renderHistory({
			selectedId: 'v1',
		});
		const latest = getByRole('option', { name: /v2/ });
		const rows = getAllByRole('option');

		expect(getByTestId('version-history')).not.toHaveAttribute('aria-label');
		expect(getByRole('listbox', { name: 'Versions' })).toContainElement(latest);
		expect(queryByRole('menuitem')).toBeNull();
		expect(rows).toHaveLength(2);
		expect(rows[0]).toHaveAttribute('aria-setsize', '2');
		expect(rows[0]).toHaveAttribute('aria-posinset', '1');
		expect(rows[1]).toHaveAttribute('aria-posinset', '2');
		expect(latest).toHaveTextContent('Latest');
		expect(latest).toHaveTextContent('Alex');
		expect(latest).toHaveTextContent('Oct 28 at 09:14');
		expect(getByRole('option', { name: /v1/ })).toHaveAttribute('aria-selected', 'true');
		expect(getByRole('option', { name: /v1/ })).toHaveAttribute('data-state', 'checked');
	});

	it('emits select when a version is opened', async () => {
		const { getByRole, emitted } = renderHistory({ selectedId: 'v1' });

		await fireEvent.click(getByRole('option', { name: /v2/ }));

		expect(emitted('select')).toEqual([['v2']]);
		expect(getByRole('option', { name: /v1/ })).toHaveAttribute('aria-selected', 'true');
	});

	it('keeps the selection when selectedId is omitted', async () => {
		const { getByRole, emitted } = renderHistory();

		await fireEvent.click(getByRole('option', { name: /v2/ }));

		expect(emitted('select')).toEqual([['v2']]);
		expect(getByRole('option', { name: /v2/ })).toHaveAttribute('aria-selected', 'true');
	});

	it('selects the default version when selectedId is omitted', async () => {
		const { getByRole, emitted } = renderHistory({ defaultSelectedId: 'v1' });

		expect(getByRole('option', { name: /v1/ })).toHaveAttribute('aria-selected', 'true');
		expect(emitted('select')).toBeUndefined();

		await fireEvent.click(getByRole('option', { name: /v2/ }));

		expect(getByRole('option', { name: /v2/ })).toHaveAttribute('aria-selected', 'true');
	});

	it('lets selectedId replace the default version', () => {
		const { getByRole } = renderHistory({ defaultSelectedId: 'v2', selectedId: 'v1' });

		expect(getByRole('option', { name: /v1/ })).toHaveAttribute('aria-selected', 'true');
		expect(getByRole('option', { name: /v2/ })).toHaveAttribute('aria-selected', 'false');
	});

	it('does not select a disabled row', async () => {
		const disabledItems = items.map((item) => ({ ...item, disabled: true }));
		const { getByRole, emitted } = renderHistory({ items: disabledItems, selectedId: 'v1' });
		const row = getByRole('option', { name: /v2/ });

		expect(row).toHaveAttribute('aria-disabled', 'true');
		await fireEvent.click(row);

		expect(emitted('select')).toBeUndefined();
	});

	it('highlights the whole row with the arrow keys and selects it on Enter', async () => {
		const { getByRole, emitted } = renderHistory({ selectedId: 'v2' });
		await nextTick();

		const current = getByRole('option', { name: /v2/ });
		current.focus();
		await userEvent.keyboard('{ArrowDown}');

		const next = getByRole('option', { name: /v1/ });
		expect(next).toHaveAttribute('data-highlighted');
		expect(next.querySelector('[data-test-id="version-history-status"]')).toBeTruthy();
		expect(next.querySelector('[data-test-id="version-history-compare"]')).toBeTruthy();
		expect(current).not.toHaveAttribute('data-highlighted');

		await userEvent.keyboard('{Enter}');

		expect(emitted('select')).toEqual([['v1']]);
	});

	it('tabs through the row buttons and keeps arrow keys on the row', async () => {
		const { getByRole, getAllByTestId } = renderHistory({ selectedId: 'v2' });
		await nextTick();
		const current = getByRole('option', { name: /v2/ });
		const compare = getAllByTestId('version-history-compare')[0];
		const menu = getAllByTestId('action-toggle')[0]?.querySelector('button');
		current.focus();

		await userEvent.tab();
		expect(compare).toHaveFocus();

		await userEvent.tab();
		expect(menu).toHaveFocus();

		await userEvent.tab();
		const next = getByRole('option', { name: /v1/ });
		expect(next).toHaveFocus();
		expect(next).toHaveAttribute('data-highlighted');

		await userEvent.keyboard('{ArrowUp}');
		expect(current).toHaveFocus();

		compare.focus();
		await userEvent.keyboard('{ArrowDown}');
		expect(compare).toHaveFocus();
		expect(current).toHaveAttribute('data-highlighted');
		expect(next).not.toHaveAttribute('data-highlighted');

		menu?.focus();
		await userEvent.keyboard('{ArrowDown}');
		expect(current).toHaveAttribute('data-highlighted');
		expect(next).not.toHaveAttribute('data-highlighted');
	});

	it('opens and closes a group with the left and right arrow keys', async () => {
		const grouped: VersionHistoryEntry[] = [
			{
				type: 'group',
				id: 'unnamed',
				label: '2 versions',
				items,
			},
		];
		const { getByRole, queryByRole } = renderHistory({ items: grouped });
		await nextTick();
		const toggle = getByRole('option', { name: '2 versions' });
		toggle.focus();

		await userEvent.keyboard('{ArrowRight}');

		expect(toggle).toHaveAttribute('aria-expanded', 'true');
		expect(getByRole('option', { name: /v2/ })).toBeTruthy();

		await userEvent.keyboard('{ArrowLeft}');

		expect(toggle).toHaveAttribute('aria-expanded', 'false');
		expect(queryByRole('option', { name: /v2/ })).toBeNull();
	});

	it('emits selectSeparate when Command or Control is held', async () => {
		const { getByRole, emitted } = renderHistory({ selectedId: 'v1' });
		const next = getByRole('option', { name: /v2/ });

		await fireEvent.click(next, { metaKey: true });

		expect(emitted('selectSeparate')).toEqual([['v2']]);
		expect(emitted('select')).toBeUndefined();
		expect(getByRole('option', { name: /v1/ })).toHaveAttribute('aria-selected', 'true');
		expect(next).toHaveAttribute('aria-selected', 'false');
	});

	it('emits selectSeparate when Control is held on the keyboard', async () => {
		const { getByRole, emitted } = renderHistory({ selectedId: 'v1' });
		const next = getByRole('option', { name: /v2/ });

		// Dispatch on the row. A programmatic selection focuses the open version.
		await fireEvent.keyDown(next, { key: 'Enter', ctrlKey: true });

		expect(emitted('selectSeparate')).toEqual([['v2']]);
		expect(emitted('select')).toBeUndefined();
		expect(getByRole('option', { name: /v1/ })).toHaveAttribute('aria-selected', 'true');
	});

	it('hides compare and keeps the menu', () => {
		const { queryByTestId, getAllByTestId } = renderHistory({ showCompare: false });

		expect(queryByTestId('version-history-compare')).toBeNull();
		expect(getAllByTestId('action-toggle').length).toBeGreaterThan(0);
	});

	it('shows the compare tooltip from the version', async () => {
		const withTooltip = items.map((item) =>
			item.id === 'v2' ? { ...item, compareTooltip: 'Compare v2\nwith v1' } : item,
		);
		const { getAllByTestId } = renderHistory({ items: withTooltip, selectedId: 'v1' });
		const [compare] = getAllByTestId('version-history-compare');

		compare.dispatchEvent(
			new PointerEvent('pointermove', {
				bubbles: true,
				cancelable: true,
				pointerType: 'mouse',
			}),
		);

		const tooltip = await waitFor(() => {
			const content = document.querySelector('[data-dismissable-layer]');
			if (!content) throw new Error('Tooltip not found');
			return content;
		});
		expect(tooltip).toHaveTextContent('Compare v2');
		expect(tooltip).toHaveTextContent('with v1');
	});

	it('shows a tooltip for the row', async () => {
		const withTooltip = items.map((item) =>
			item.id === 'v1'
				? {
						...item,
						tooltip: { title: 'v1 (Published)', detail: 'Published by Alex, Oct 24 at 14:28' },
					}
				: item,
		);
		const { getByRole } = renderHistory({ items: withTooltip, selectedId: 'v2' });
		const option = getByRole('option', { name: /v1/ });
		const trigger = option.firstElementChild ?? option;

		trigger.dispatchEvent(
			new PointerEvent('pointermove', {
				bubbles: true,
				cancelable: true,
				pointerType: 'mouse',
			}),
		);

		const tooltip = await waitFor(() => {
			const content = [...document.querySelectorAll('[data-dismissable-layer]')].find((node) =>
				node.textContent?.includes('Published by Alex'),
			);
			if (!content) throw new Error('Tooltip not found');
			return content;
		});
		expect(tooltip).toHaveTextContent('v1 (Published)');
		expect(tooltip).toHaveTextContent('Published by Alex, Oct 24 at 14:28');
		expect(getByRole('option', { name: /v1/ })).toHaveAttribute('data-state', 'unchecked');
		expect(getByRole('option', { name: /v2/ })).toHaveAttribute('data-state', 'checked');
	});

	it('renders the footer after the rows', () => {
		const { getByTestId, getByText } = renderHistory(
			{},
			{ footer: '<p>Older versions are hidden</p>' },
		);

		expect(getByTestId('version-history-footer')).toBeTruthy();
		expect(getByText('Older versions are hidden')).toBeTruthy();
	});

	it('emits compare without selecting the row', async () => {
		const { getAllByTestId, emitted } = renderHistory({ selectedId: 'v1' });
		const [compare] = getAllByTestId('version-history-compare');

		await fireEvent.click(compare);

		expect(emitted('compare')).toEqual([['v2']]);
		expect(emitted('select')).toBeUndefined();
	});

	it('renders the empty slot when there are no versions', () => {
		const { getByTestId, getByText, queryByTestId } = renderHistory(
			{ items: [] },
			{ empty: '<p>No versions yet</p>' },
		);

		expect(getByTestId('version-history')).toHaveAttribute('aria-label', 'Versions');
		expect(getByTestId('version-history-empty')).toBeTruthy();
		expect(getByText('No versions yet')).toBeTruthy();
		expect(queryByTestId('version-history-item')).toBeNull();
	});

	it('replaces the row actions when the actions slot is set', () => {
		const { getAllByRole, queryByTestId } = renderHistory(
			{},
			{ actions: '<button type="button">Pin</button>' },
		);

		expect(getAllByRole('button', { name: 'Pin' })).toHaveLength(2);
		expect(queryByTestId('version-history-compare')).toBeNull();
	});

	it('disables compare and the menu', () => {
		const disabledItems = items.map((item) => ({
			...item,
			compareDisabled: true,
			actionsDisabled: true,
		}));
		const { getAllByTestId } = renderHistory({ items: disabledItems });

		for (const compare of getAllByTestId('version-history-compare')) {
			expect(compare).toBeDisabled();
		}

		for (const menu of getAllByTestId('action-toggle')) {
			expect(menu.querySelector('button')).toBeDisabled();
		}
	});

	it('shows skeleton rows while versions load', () => {
		const { getByTestId, queryByTestId, queryByText } = renderHistory({ loading: true });

		expect(getByTestId('version-history')).not.toHaveAttribute('aria-label');
		expect(getByTestId('version-history-loading')).toHaveAttribute(
			'aria-label',
			'Loading versions',
		);
		expect(queryByTestId('version-history-item')).toBeNull();
		expect(queryByText('No versions yet')).toBeNull();
	});

	it('draws a filled mark for published and latest, and a ring otherwise', () => {
		const { getAllByTestId } = renderHistory({
			items: [...items, { id: 'v0', label: 'v0' }],
		});

		expect(
			getAllByTestId('version-history-status').map((mark) => mark.getAttribute('data-status')),
		).toEqual(['latest', 'published', 'default']);
	});

	it('connects the marks and leaves the ends open', () => {
		const { getAllByTestId } = renderHistory();
		const rows = getAllByTestId('version-history-row');

		expect(rows).toHaveLength(2);
		expect(rows[0].querySelector('[data-segment="gap"]')).toBeNull();
		expect(rows[0].querySelector('[data-segment="above"]')).toBeNull();
		expect(rows[0].querySelector('[data-segment="below"]')).toBeTruthy();
		expect(rows[1].querySelector('[data-segment="gap"]')).toBeTruthy();
		expect(rows[1].querySelector('[data-segment="above"]')).toBeTruthy();
		expect(rows[1].querySelector('[data-segment="below"]')).toBeNull();
	});

	it('replaces the heading label when the heading slot is set', () => {
		const withHeading: VersionHistoryEntry[] = [
			items[0],
			{ type: 'heading', id: 'earlier', label: 'Earlier' },
			items[1],
		];
		const { getByTestId, queryByText } = renderHistory(
			{ items: withHeading },
			{
				heading: '<span data-test-id="custom-heading">{{ params.id }} {{ params.label }}</span>',
			},
		);

		expect(getByTestId('custom-heading')).toHaveTextContent('earlier Earlier');
		expect(queryByText('Earlier', { exact: true })).toBeNull();
	});

	it('ends the line at a heading and starts the next track with no line above', () => {
		const withHeading: VersionHistoryEntry[] = [
			items[0],
			{ type: 'heading', id: 'earlier', label: 'Earlier' },
			items[1],
		];
		const { getAllByTestId, getByText } = renderHistory({ items: withHeading });
		const rows = getAllByTestId('version-history-row');

		expect(getByText('Earlier')).toBeTruthy();
		expect(rows[0].querySelector('[data-segment="below"]')).toBeNull();
		expect(rows[1].querySelector('[data-test-id="version-history-line"]')).toBeNull();
		expect(rows[2].querySelector('[data-segment="gap"]')).toBeNull();
		expect(rows[2].querySelector('[data-segment="above"]')).toBeNull();
	});

	it('draws no line when there is one version', () => {
		const { getByTestId, queryByTestId } = renderHistory({ items: [items[0]] });

		expect(getByTestId('version-history-row')).toBeTruthy();
		expect(queryByTestId('version-history-line')).toBeNull();
	});

	it('hides grouped versions until the toggle opens them', async () => {
		const grouped: VersionHistoryEntry[] = [
			{
				type: 'group',
				id: 'unnamed',
				label: '2 versions',
				items,
			},
		];
		const { getByRole, queryByRole, emitted } = renderHistory({ items: grouped });
		const toggle = getByRole('option', { name: '2 versions' });

		expect(toggle).toHaveAttribute('aria-expanded', 'false');
		expect(queryByRole('option', { name: /v2/ })).toBeNull();

		await fireEvent.click(toggle);

		expect(emitted('select')).toBeUndefined();
		expect(toggle).toHaveAttribute('aria-expanded', 'true');
		expect(getByRole('option', { name: /v2/ })).toBeTruthy();
		expect(getByRole('option', { name: /v1/ })).toBeTruthy();

		await fireEvent.click(toggle);

		expect(toggle).toHaveAttribute('aria-expanded', 'false');
		expect(queryByRole('option', { name: /v2/ })).toBeNull();
	});

	it('opens the group that contains the selected version', () => {
		const grouped: VersionHistoryEntry[] = [
			{
				type: 'group',
				id: 'unnamed',
				label: '2 versions',
				items,
			},
		];
		const { getByRole } = renderHistory({ items: grouped, selectedId: 'v1' });

		expect(getByRole('option', { name: '2 versions' })).toHaveAttribute('aria-expanded', 'true');
		expect(getByRole('option', { name: /v1/ })).toHaveAttribute('aria-selected', 'true');
	});

	it('opens the group that contains the default version', () => {
		const grouped: VersionHistoryEntry[] = [
			{
				type: 'group',
				id: 'unnamed',
				label: '2 versions',
				items,
			},
		];
		const { getByRole } = renderHistory({ items: grouped, defaultSelectedId: 'v1' });

		expect(getByRole('option', { name: '2 versions' })).toHaveAttribute('aria-expanded', 'true');
		expect(getByRole('option', { name: /v1/ })).toHaveAttribute('aria-selected', 'true');
	});

	it('replaces rows that leave the view when the list scrolls', async () => {
		// Same height as the row estimate in VersionHistory.vue. The scroller
		// measures each row from offsetHeight, which jsdom reports as 0.
		const rowHeight = 48;
		const originalOffsetHeight = Object.getOwnPropertyDescriptor(
			HTMLElement.prototype,
			'offsetHeight',
		);
		Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
			configurable: true,
			value: rowHeight,
		});

		try {
			const many: VersionHistoryItem[] = Array.from({ length: 40 }, (_, index) => ({
				id: `version-${index}`,
				label: `Version ${index}`,
			}));
			const { getByRole, queryByRole, container } = renderHistory({ items: many });

			const first = getByRole('option', { name: 'Version 0' });

			expect(getByRole('listbox', { name: 'Versions' })).toContainElement(first);
			expect(first).toHaveAttribute('aria-setsize', '40');
			expect(first).toHaveAttribute('aria-posinset', '1');
			expect(queryByRole('option', { name: 'Version 39' })).toBeNull();

			const scroller = container.querySelector('.recycle-scroller-wrapper');
			expect(scroller).toBeInstanceOf(HTMLElement);
			if (!(scroller instanceof HTMLElement)) return;

			// jsdom drops a scroll offset that exceeds the layout height.
			let scrollTop = 0;
			Object.defineProperty(scroller, 'scrollTop', {
				configurable: true,
				get: () => scrollTop,
				set: (value: number) => {
					scrollTop = value;
				},
			});

			// The scroller keeps a few rows outside the viewport, so this offset
			// has to pass that buffer before the first row leaves the DOM.
			const laterIndex = 20;
			scrollTop = rowHeight * laterIndex;
			await fireEvent.scroll(scroller);

			const later = getByRole('option', { name: `Version ${laterIndex}` });

			expect(queryByRole('option', { name: 'Version 0' })).toBeNull();
			expect(later).toHaveAttribute('aria-setsize', '40');
			expect(later).toHaveAttribute('aria-posinset', `${laterIndex + 1}`);
			expect(queryByRole('option', { name: 'Version 39' })).toBeNull();
		} finally {
			if (originalOffsetHeight) {
				Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight);
			} else {
				Reflect.deleteProperty(HTMLElement.prototype, 'offsetHeight');
			}
		}
	});

	it('pins a heading at the top and lets the next heading push it up', async () => {
		const rowHeight = 48;
		const originalOffsetHeight = Object.getOwnPropertyDescriptor(
			HTMLElement.prototype,
			'offsetHeight',
		);
		Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
			configurable: true,
			value: rowHeight,
		});

		try {
			const versions: VersionHistoryItem[] = Array.from({ length: 8 }, (_, index) => ({
				id: `version-${index}`,
				label: `Version ${index}`,
			}));
			const entries: VersionHistoryEntry[] = [
				{ type: 'heading', id: 'recent', label: 'Recent' },
				...versions.slice(0, 6),
				{ type: 'heading', id: 'older', label: 'Older' },
				...versions.slice(6),
			];
			const { getByTestId, queryByTestId, container } = renderHistory(
				{ items: entries },
				{ heading: '<span data-test-id="custom-heading">{{ params.label }}</span>' },
			);
			await nextTick();

			expect(queryByTestId('version-history-sticky-heading')).toBeNull();

			const scroller = container.querySelector('.recycle-scroller-wrapper');
			expect(scroller).toBeInstanceOf(HTMLElement);
			if (!(scroller instanceof HTMLElement)) return;

			// jsdom drops a scroll offset that exceeds the layout height.
			let scrollTop = 0;
			Object.defineProperty(scroller, 'scrollTop', {
				configurable: true,
				get: () => scrollTop,
				set: (value: number) => {
					scrollTop = value;
				},
			});

			scrollTop = rowHeight * 3;
			await fireEvent.scroll(scroller);

			const pinned = getByTestId('version-history-sticky-heading');
			expect(pinned).toHaveTextContent('Recent');
			expect(pinned.querySelector('[data-test-id="custom-heading"]')).toHaveTextContent('Recent');
			expect(pinned).toHaveAttribute('aria-hidden', 'true');
			expect(pinned.firstElementChild).not.toHaveAttribute('style');

			// The next heading starts after the first heading and six versions.
			const olderTop = rowHeight * 7;
			scrollTop = olderTop - 10;
			await fireEvent.scroll(scroller);

			const shifting = getByTestId('version-history-sticky-heading');
			expect(shifting).toHaveTextContent('Recent');
			expect(shifting.firstElementChild).toHaveStyle({ transform: 'translateY(-38px)' });

			scrollTop = olderTop;
			await fireEvent.scroll(scroller);
			expect(queryByTestId('version-history-sticky-heading')).toBeNull();

			scrollTop = olderTop + rowHeight;
			await fireEvent.scroll(scroller);
			expect(getByTestId('version-history-sticky-heading')).toHaveTextContent('Older');
		} finally {
			if (originalOffsetHeight) {
				Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight);
			} else {
				Reflect.deleteProperty(HTMLElement.prototype, 'offsetHeight');
			}
		}
	});

	describe('scroll target', () => {
		const ROW_HEIGHT = 48;

		function manyItems(count = 40): VersionHistoryItem[] {
			return Array.from({ length: count }, (_, index) => ({
				id: `version-${index}`,
				label: `Version ${index}`,
			}));
		}

		async function withMeasuredRows(run: () => Promise<void>) {
			const originalOffsetHeight = Object.getOwnPropertyDescriptor(
				HTMLElement.prototype,
				'offsetHeight',
			);
			const originalScrollTop = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTop');
			// jsdom clamps scrollTop to the layout height, which stays 0 here.
			const scrollTops = new WeakMap<HTMLElement, number>();
			Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
				configurable: true,
				value: ROW_HEIGHT,
			});
			Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
				configurable: true,
				get() {
					return scrollTops.get(this) ?? 0;
				},
				set(value: number) {
					scrollTops.set(this, value);
				},
			});

			try {
				await run();
			} finally {
				if (originalOffsetHeight) {
					Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight);
				} else {
					Reflect.deleteProperty(HTMLElement.prototype, 'offsetHeight');
				}
				if (originalScrollTop) {
					Object.defineProperty(HTMLElement.prototype, 'scrollTop', originalScrollTop);
				} else {
					Reflect.deleteProperty(HTMLElement.prototype, 'scrollTop');
				}
			}
		}

		function isHistoryScroller(vm: object): vm is { scrollTo: (id: string) => void } {
			return 'scrollTo' in vm && typeof vm.scrollTo === 'function';
		}

		function scrollTarget(vm: object): (id: string) => void {
			if (!isHistoryScroller(vm)) {
				throw new Error('scrollTo is not exposed');
			}

			return (id: string) => {
				vm.scrollTo(id);
			};
		}

		it('scrolls a row below the heading that covers it', async () => {
			await withMeasuredRows(async () => {
				const versions: VersionHistoryEntry[] = [
					{ type: 'heading', id: 'recent', label: 'Recent' },
					...manyItems(10),
					{ type: 'heading', id: 'older', label: 'Older' },
					{ id: 'version-under-older', label: 'Under older' },
				];
				const scrollTo = vi.spyOn(HTMLElement.prototype, 'scrollTo');

				try {
					renderHistory({ items: versions, scrollToId: 'version-under-older' });
					await nextTick();

					// Recent, ten versions, Older, then the target. The target starts below Older.
					expect(scrollTo).toHaveBeenCalledWith({
						top: ROW_HEIGHT * 11,
						behavior: 'auto',
					});
				} finally {
					scrollTo.mockRestore();
				}
			});
		});

		it('scrolls a heading to its own top', async () => {
			await withMeasuredRows(async () => {
				const versions: VersionHistoryEntry[] = [
					{ type: 'heading', id: 'recent', label: 'Recent' },
					...manyItems(10),
					{ type: 'heading', id: 'older', label: 'Older' },
				];
				const scrollTo = vi.spyOn(HTMLElement.prototype, 'scrollTo');

				try {
					renderHistory({ items: versions, scrollToId: 'older' });
					await nextTick();

					expect(scrollTo).toHaveBeenCalledWith({
						top: ROW_HEIGHT * 11,
						behavior: 'auto',
					});
				} finally {
					scrollTo.mockRestore();
				}
			});
		});

		it('scrolls to the row when scrollToId is set', async () => {
			await withMeasuredRows(async () => {
				const versions = manyItems();
				const scrollTo = vi.spyOn(HTMLElement.prototype, 'scrollTo');

				try {
					renderHistory({ items: versions, scrollToId: 'version-20' });
					await nextTick();

					expect(scrollTo).toHaveBeenCalledWith({ top: ROW_HEIGHT * 20, behavior: 'auto' });
				} finally {
					scrollTo.mockRestore();
				}
			});
		});

		it('opens the group that contains the scroll target', async () => {
			await withMeasuredRows(async () => {
				const grouped: VersionHistoryEntry[] = [
					{ id: 'v3', label: 'v3' },
					{ type: 'group', id: 'unnamed', label: '2 versions', items },
				];
				const scrollTo = vi.spyOn(HTMLElement.prototype, 'scrollTo').mockImplementation(function (
					this: HTMLElement,
					options?: ScrollToOptions | number,
				) {
					if (typeof options === 'object' && typeof options.top === 'number') {
						this.scrollTop = options.top;
					}
				});

				try {
					const { getByRole } = renderHistory({ items: grouped, scrollToId: 'v1' });
					await nextTick();
					await nextTick();

					expect(getByRole('option', { name: '2 versions' })).toHaveAttribute(
						'aria-expanded',
						'true',
					);
					expect(getByRole('option', { name: /v1/ })).toBeTruthy();
					expect(scrollTo).toHaveBeenCalledWith({ top: ROW_HEIGHT * 3, behavior: 'auto' });
				} finally {
					scrollTo.mockRestore();
				}
			});
		});

		it('scrolls after loading finishes', async () => {
			await withMeasuredRows(async () => {
				const versions = manyItems();
				const scrollTo = vi.spyOn(HTMLElement.prototype, 'scrollTo');

				try {
					const { rerender } = renderHistory({
						items: versions,
						loading: true,
						scrollToId: 'version-20',
					});
					await nextTick();

					expect(scrollTo).not.toHaveBeenCalled();

					await rerender({ items: versions, loading: false, scrollToId: 'version-20' });
					await nextTick();

					expect(scrollTo).toHaveBeenCalledWith({ top: ROW_HEIGHT * 20, behavior: 'auto' });
				} finally {
					scrollTo.mockRestore();
				}
			});
		});

		it('keeps the scroll position when the open version changes', async () => {
			await withMeasuredRows(async () => {
				const versions = manyItems();
				const { rerender } = renderHistory({ items: versions, selectedId: 'version-0' });
				await nextTick();
				const scrollTo = vi.spyOn(HTMLElement.prototype, 'scrollTo');

				try {
					await rerender({ items: versions, selectedId: 'version-20' });
					await nextTick();

					expect(scrollTo).not.toHaveBeenCalled();
				} finally {
					scrollTo.mockRestore();
				}
			});
		});

		it('scrolls again when scrollTo is called with the same id', async () => {
			await withMeasuredRows(async () => {
				const versions = manyItems();
				const wrapper = mount(N8nVersionHistory, {
					props: { items: versions, scrollToId: 'version-20' },
				});
				const scrollTo = vi.spyOn(wrapper.get('.recycle-scroller-wrapper').element, 'scrollTo');
				await nextTick();
				await nextTick();
				scrollTo.mockClear();
				const show = scrollTarget(wrapper.vm);

				try {
					show('version-20');
					await nextTick();
					show('version-20');
					await nextTick();

					expect(scrollTo).toHaveBeenCalledTimes(2);
					expect(scrollTo).toHaveBeenLastCalledWith({ top: ROW_HEIGHT * 20, behavior: 'auto' });
				} finally {
					scrollTo.mockRestore();
					wrapper.unmount();
				}
			});
		});
	});

	describe('load more', () => {
		beforeEach(() => {
			observe.mockClear();
			vi.mocked(useIntersectionObserver).mockClear();
		});

		function intersect() {
			vi.mocked(useIntersectionObserver).mock.lastCall?.[0].onIntersect();
		}

		it('asks for the next page when the end of the list comes into view', async () => {
			const { getByTestId, emitted } = renderHistory({ hasMore: true });
			await nextTick();

			const sentinel = getByTestId('version-history-load-more');

			expect(sentinel).toHaveAttribute('aria-hidden', 'true');
			expect(observe).toHaveBeenCalledWith(sentinel);

			intersect();
			intersect();

			expect(emitted('loadMore')).toHaveLength(1);
		});

		it('shows a status at the end while the next page loads', async () => {
			const { getByRole, getByTestId, emitted } = renderHistory({
				hasMore: true,
				loadingMore: true,
			});
			await nextTick();

			const status = getByTestId('version-history-load-more');

			expect(status).toHaveAttribute('aria-label', 'Loading more versions');
			expect(status).toHaveAttribute('aria-busy', 'true');
			expect(getByRole('option', { name: /v2/ })).toBeTruthy();
			expect(observe).not.toHaveBeenCalled();

			intersect();

			expect(emitted('loadMore')).toBeUndefined();
		});

		it('uses a custom name for the loading-more status', () => {
			const { getByTestId } = renderHistory({
				hasMore: true,
				loadingMore: true,
				loadingMoreLabel: 'Fetching',
			});

			expect(getByTestId('version-history-load-more')).toHaveAttribute('aria-label', 'Fetching');
		});

		it('hides the end marker when every version is loaded', async () => {
			const { queryByTestId } = renderHistory();
			await nextTick();

			expect(queryByTestId('version-history-load-more')).toBeNull();
			expect(observe).not.toHaveBeenCalled();
		});

		it('hides the end marker while the first page loads', () => {
			const { queryByTestId } = renderHistory({ loading: true, hasMore: true });

			expect(queryByTestId('version-history-load-more')).toBeNull();
		});

		it('does not extend the line into the end marker', () => {
			const { getAllByTestId } = renderHistory({ hasMore: true });
			const rows = getAllByTestId('version-history-row');

			expect(rows).toHaveLength(2);
			expect(rows[1]?.querySelector('[data-segment="below"]')).toBeNull();
		});

		it('watches the end again after a page is appended', async () => {
			const { rerender, getByTestId } = renderHistory({ hasMore: true });
			await nextTick();
			observe.mockClear();

			await rerender({
				hasMore: true,
				items: [...items, { id: 'v0', label: 'v0' }],
			});
			await nextTick();

			expect(observe).toHaveBeenCalledWith(getByTestId('version-history-load-more'));
		});
	});
});
