import userEvent from '@testing-library/user-event';
import { fireEvent, render, waitFor } from '@testing-library/vue';
import { ref } from 'vue';

import type {
	ContextMenuExposed,
	ContextMenuId,
	ContextMenuNode,
	ContextMenuProps,
} from './ContextMenu.types';
import ContextMenu from './ContextMenu.vue';

vi.mock('../N8nKeyboardShortcut', () => ({
	N8nKeyboardShortcut: {
		name: 'N8nKeyboardShortcut',
		props: ['keys', 'metaKey', 'shiftKey', 'altKey'],
		template: '<span>{{ keys?.join("") }}</span>',
	},
}));

const createItems = (count: number): Array<ContextMenuNode<string>> => {
	return Array.from({ length: count }, (_, i) => ({
		type: 'item',
		id: `item-${i}`,
		label: `Item ${i}`,
	}));
};

const defaultSlots = {
	trigger: '<button data-test-id="custom-trigger">Open</button>',
};

const keyboardShortcutStub = {
	props: ['keys', 'metaKey', 'shiftKey', 'altKey'],
	template: '<span>{{ keys?.join("") }}</span>',
};

async function getContextMenu() {
	const menu = await waitFor(() => {
		const el = document.querySelector('[data-test-id="context-menu"]');
		if (!el) throw new Error('Context menu not found');
		return el as HTMLElement;
	});

	return { menu };
}

async function openWithRightClick(element: HTMLElement) {
	await fireEvent.contextMenu(element);
}

function contextMenuEventsFrom(spy: { mock: { calls: unknown[][] } }): PointerEvent[] {
	return spy.mock.calls
		.map(([value]) => value)
		.filter(
			(value): value is PointerEvent =>
				value instanceof PointerEvent && value.type === 'contextmenu',
		);
}

function renderMenu(options: {
	props: ContextMenuProps<ContextMenuId>;
	slots?: Record<string, string>;
}) {
	return render(ContextMenu, {
		...options,
		global: {
			stubs: { N8nKeyboardShortcut: keyboardShortcutStub },
		},
	});
}

async function renderOpen(
	props: ContextMenuProps<ContextMenuId>,
	slots: Record<string, string> = defaultSlots,
) {
	const wrapper = renderMenu({ props, slots });
	await openWithRightClick(wrapper.getByTestId('custom-trigger'));
	await getContextMenu();
	return wrapper;
}

describe('N8nContextMenu', () => {
	describe('rendering', () => {
		it('should render custom trigger via slot', () => {
			const wrapper = renderMenu({
				props: {
					items: createItems(3),
				},
				slots: defaultSlots,
			});

			expect(wrapper.getByTestId('custom-trigger')).toBeInTheDocument();
		});

		it('should not show menu content initially', () => {
			renderMenu({
				props: {
					items: createItems(3),
				},
				slots: defaultSlots,
			});

			expect(document.querySelector('[data-test-id="context-menu"]')).not.toBeInTheDocument();
		});

		it('should render a hidden coordinate trigger when the trigger slot is omitted', () => {
			const { container } = renderMenu({
				props: {
					items: createItems(3),
				},
			});

			const trigger = container.querySelector('[aria-hidden="true"]');
			expect(trigger).toBeInTheDocument();
		});
	});

	describe('opening and closing', () => {
		it('should open on right-click and emit update:open', async () => {
			const wrapper = renderMenu({
				props: {
					items: createItems(3),
				},
				slots: defaultSlots,
			});

			await openWithRightClick(wrapper.getByTestId('custom-trigger'));

			const { menu } = await getContextMenu();
			expect(menu).toBeInTheDocument();
			expect(wrapper.emitted('update:open')?.[0]).toEqual([true]);
		});

		it('should close on Escape and emit update:open false', async () => {
			const wrapper = renderMenu({
				props: {
					items: createItems(3),
				},
				slots: defaultSlots,
			});

			await openWithRightClick(wrapper.getByTestId('custom-trigger'));
			await getContextMenu();

			await userEvent.keyboard('{Escape}');
			await waitFor(() => {
				expect(document.querySelector('[data-test-id="context-menu"]')).not.toBeInTheDocument();
			});
			const emits = wrapper.emitted('update:open');
			expect(emits?.[emits.length - 1]).toEqual([false]);
		});

		it('should open when defaultOpen is true', async () => {
			renderMenu({
				props: {
					items: createItems(3),
					defaultOpen: true,
				},
				slots: defaultSlots,
			});

			await getContextMenu();
		});

		it('should use position when defaultOpen is true', async () => {
			const dispatchSpy = vi.spyOn(HTMLElement.prototype, 'dispatchEvent');

			renderMenu({
				props: {
					items: createItems(3),
					defaultOpen: true,
					position: [48, 8],
					modal: false,
				},
			});

			await getContextMenu();

			const event = contextMenuEventsFrom(dispatchSpy).at(-1);
			expect(event?.clientX).toBe(48);
			expect(event?.clientY).toBe(8);
		});

		it('should open when the open prop is true on first render', async () => {
			renderMenu({
				props: {
					items: createItems(3),
					open: true,
				},
				slots: defaultSlots,
			});

			await getContextMenu();
		});

		it('should open at an offset from the trigger when position is set', async () => {
			const wrapper = renderMenu({
				props: {
					items: createItems(3),
					open: false,
					position: [10, 20],
					modal: false,
				},
				slots: defaultSlots,
			});

			const host = wrapper.getByTestId('custom-trigger').parentElement as HTMLElement;
			vi.spyOn(host, 'getBoundingClientRect').mockReturnValue({
				x: 100,
				y: 50,
				top: 50,
				left: 100,
				bottom: 70,
				right: 180,
				width: 80,
				height: 20,
				toJSON: () => ({}),
			});
			const dispatchSpy = vi.spyOn(host, 'dispatchEvent');

			await wrapper.rerender({
				items: createItems(3),
				open: true,
				position: [10, 20],
				modal: false,
			});

			await getContextMenu();

			const event = contextMenuEventsFrom(dispatchSpy).at(-1);

			expect(event?.clientX).toBe(110);
			expect(event?.clientY).toBe(70);
		});

		it('should ignore position on right-click', async () => {
			const wrapper = renderMenu({
				props: {
					items: createItems(3),
					position: [10, 20],
					modal: false,
				},
				slots: defaultSlots,
			});

			const host = wrapper.getByTestId('custom-trigger').parentElement as HTMLElement;
			vi.spyOn(host, 'getBoundingClientRect').mockReturnValue({
				x: 100,
				y: 50,
				top: 50,
				left: 100,
				bottom: 70,
				right: 180,
				width: 80,
				height: 20,
				toJSON: () => ({}),
			});
			const dispatchSpy = vi.spyOn(host, 'dispatchEvent');

			await openWithRightClick(wrapper.getByTestId('custom-trigger'));
			await getContextMenu();

			expect(
				contextMenuEventsFrom(dispatchSpy).some(
					(event) => event.clientX === 110 && event.clientY === 70,
				),
			).toBe(false);
		});

		it('should open when the open prop becomes true', async () => {
			const wrapper = renderMenu({
				props: {
					items: createItems(3),
					open: false,
				},
				slots: defaultSlots,
			});

			await wrapper.rerender({
				items: createItems(3),
				open: true,
			});

			await getContextMenu();
		});

		it('should close when the open prop becomes false', async () => {
			const wrapper = renderMenu({
				props: {
					items: createItems(3),
					open: true,
				},
				slots: defaultSlots,
			});

			await getContextMenu();

			await wrapper.rerender({
				items: createItems(3),
				open: false,
			});

			await waitFor(() => {
				expect(document.querySelector('[data-test-id="context-menu"]')).not.toBeInTheDocument();
			});
		});
	});

	describe('items rendering', () => {
		it('should render item labels', async () => {
			const items: Array<ContextMenuNode<string>> = [
				{ type: 'item', id: '1', label: 'First Option' },
				{ type: 'item', id: '2', label: 'Second Option' },
			];

			await renderOpen({ items });

			expect(document.querySelectorAll('[role="menuitem"]')).toHaveLength(2);
			expect(document.querySelector('[data-test-id="context-menu"]')?.textContent).toContain(
				'First Option',
			);
			expect(document.querySelector('[data-test-id="context-menu"]')?.textContent).toContain(
				'Second Option',
			);
		});

		it('should apply an explicit icon color when the item supplies one', async () => {
			const items: Array<ContextMenuNode<string>> = [
				{
					type: 'item',
					id: 'folder',
					label: 'Folder',
					icon: { type: 'icon', value: 'folder', color: '--node--icon--color--blue' },
				},
			];

			await renderOpen({ items });

			expect(document.querySelector('[data-icon="folder"]')).toHaveStyle({
				color: 'var(--node--icon--color--blue)',
			});
		});

		it('should use the tone-derived icon color when the item has no icon color', async () => {
			const items: Array<ContextMenuNode<string>> = [
				{
					type: 'item',
					id: 'open',
					label: 'Open',
					icon: { type: 'icon', value: 'external-link' },
				},
				{
					type: 'item',
					id: 'locked',
					label: 'Locked',
					disabled: true,
					icon: { type: 'icon', value: 'lock' },
				},
				{
					type: 'item',
					id: 'delete',
					label: 'Delete',
					variant: 'destructive',
					icon: { type: 'icon', value: 'trash' },
				},
			];

			await renderOpen({ items });

			expect(document.querySelector('[data-icon="external-link"]')).toHaveStyle({
				color: 'var(--icon-color)',
			});
			expect(document.querySelector('[data-icon="lock"]')).toHaveStyle({
				color: 'var(--icon-color--subtle)',
			});
			expect(document.querySelector('[data-icon="trash"]')).toHaveStyle({
				color: 'var(--icon-color--danger)',
			});
		});

		it('should render disabled items', async () => {
			const items: Array<ContextMenuNode<string>> = [
				{ type: 'item', id: '1', label: 'Enabled', disabled: false },
				{ type: 'item', id: '2', label: 'Disabled', disabled: true },
			];

			await renderOpen({ items });

			await waitFor(() => {
				const menuItems = document.querySelectorAll('[role="menuitem"]');
				expect(menuItems[1]).toHaveAttribute('data-disabled');
			});
		});

		it('should render a group label as a non-interactive header', async () => {
			const items: Array<ContextMenuNode<string>> = [
				{
					type: 'group',
					id: 'section',
					label: 'Section title',
					children: [{ type: 'item', id: 'option-1', label: 'Option 1' }],
				},
			];

			await renderOpen({ items });

			expect(document.body.textContent).toContain('Section title');
			expect(document.querySelectorAll('[role="menuitem"]')).toHaveLength(1);
			expect(document.querySelector('[class*="separated"]')).not.toBeInTheDocument();
		});

		it('should render a separator before a section that follows another node', async () => {
			const items: Array<ContextMenuNode<string>> = [
				{ type: 'item', id: 'open', label: 'Open' },
				{
					type: 'group',
					id: 'view',
					children: [{ type: 'item', id: 'grid', label: 'Grid' }],
				},
			];

			await renderOpen({ items });

			expect(document.querySelector('[class*="separated"]')).toBeInTheDocument();
		});

		it('should render mixed item, checkbox, and radio rows', async () => {
			const items: Array<ContextMenuNode<string>> = [
				{ type: 'item', id: 'open', label: 'Open' },
				{ type: 'checkbox', id: 'show-grid', label: 'Show grid' },
				{
					type: 'radio-group',
					id: 'snap',
					label: 'Snap',
					children: [
						{ type: 'radio', id: 'snap-off', label: 'Off' },
						{ type: 'radio', id: 'snap-grid', label: 'Grid' },
					],
				},
			];

			await renderOpen({ items });

			await waitFor(() => {
				expect(document.querySelectorAll('[role="menuitem"]')).toHaveLength(1);
				expect(document.querySelectorAll('[role="menuitemcheckbox"]')).toHaveLength(1);
				expect(document.querySelectorAll('[role="menuitemradio"]')).toHaveLength(2);
				expect(document.body.textContent).toContain('Snap');
			});
		});

		it('should apply a custom class on a group', async () => {
			const items: Array<ContextMenuNode<string>> = [
				{
					type: 'group',
					id: 'edit',
					class: 'custom-group',
					children: [{ type: 'item', id: 'open', label: 'Open' }],
				},
			];

			await renderOpen({ items });

			expect(document.querySelector('.custom-group')).toBeInTheDocument();
		});
	});

	describe('select event', () => {
		it('should emit select and close the menu when an item is clicked', async () => {
			const items: Array<ContextMenuNode<string>> = [
				{ type: 'item', id: 'option-1', label: 'Option 1' },
				{ type: 'item', id: 'option-2', label: 'Option 2' },
			];

			const wrapper = await renderOpen({ items });

			const menuItems = document.querySelectorAll('[role="menuitem"]');
			await userEvent.click(menuItems[0]);

			await waitFor(() => {
				expect(wrapper.emitted('select')?.[0]).toEqual(['option-1']);
			});
			await waitFor(() => {
				expect(document.querySelector('[data-test-id="context-menu"]')).not.toBeInTheDocument();
			});
		});

		it('should keep the menu open after selecting a keepOpen item', async () => {
			const items: Array<ContextMenuNode<string>> = [
				{ type: 'item', id: 'toggle', label: 'Toggle', keepOpen: true },
			];

			const wrapper = await renderOpen({ items });

			const menuItem = document.querySelector('[role="menuitem"]')!;
			await userEvent.click(menuItem);

			await waitFor(() => {
				expect(wrapper.emitted('select')?.[0]).toEqual(['toggle']);
			});
			expect(document.querySelector('[data-test-id="context-menu"]')).toBeInTheDocument();
		});

		it('should not emit select event for disabled items', async () => {
			const items: Array<ContextMenuNode<string>> = [
				{ type: 'item', id: 'disabled-item', label: 'Disabled', disabled: true },
			];

			const wrapper = await renderOpen({ items });

			const menuItem = document.querySelector('[role="menuitem"]')!;
			await userEvent.click(menuItem);

			expect(wrapper.emitted('select')).toBeFalsy();
		});

		it('should not emit select when a checkbox is toggled', async () => {
			const items: Array<ContextMenuNode<string>> = [
				{ type: 'checkbox', id: 'show-grid', label: 'Show grid' },
			];

			const wrapper = await renderOpen({ items });

			const checkbox = document.querySelector('[role="menuitemcheckbox"]') as HTMLElement;
			await userEvent.click(checkbox);

			await waitFor(() => {
				expect(wrapper.emitted('update:selectedValues')?.[0]).toEqual([['show-grid']]);
			});
			expect(wrapper.emitted('select')).toBeFalsy();
			expect(document.querySelector('[data-test-id="context-menu"]')).toBeInTheDocument();
		});

		it('should not emit select when a radio is selected', async () => {
			const items: Array<ContextMenuNode<string>> = [
				{
					type: 'radio-group',
					id: 'snap',
					children: [
						{ type: 'radio', id: 'snap-off', label: 'Off' },
						{ type: 'radio', id: 'snap-grid', label: 'Grid' },
					],
				},
			];

			const wrapper = await renderOpen({ items });

			const radios = document.querySelectorAll('[role="menuitemradio"]');
			await userEvent.click(radios[1]);

			await waitFor(() => {
				expect(wrapper.emitted('update:selectedValues')?.[0]).toEqual([['snap-grid']]);
			});
			expect(wrapper.emitted('select')).toBeFalsy();
			expect(document.querySelector('[data-test-id="context-menu"]')).toBeInTheDocument();
		});
	});

	describe('checkboxes', () => {
		it('should toggle a checkbox off when it is already selected', async () => {
			const items: Array<ContextMenuNode<string>> = [
				{ type: 'checkbox', id: 'show-grid', label: 'Show grid' },
			];

			const wrapper = await renderOpen({
				items,
				defaultSelectedValues: ['show-grid'],
			});

			const checkbox = document.querySelector('[role="menuitemcheckbox"]') as HTMLElement;
			expect(checkbox).toHaveAttribute('aria-checked', 'true');

			await userEvent.click(checkbox);

			await waitFor(() => {
				expect(wrapper.emitted('update:selectedValues')?.[0]).toEqual([[]]);
			});
		});

		it('should not toggle a disabled checkbox', async () => {
			const items: Array<ContextMenuNode<string>> = [
				{ type: 'checkbox', id: 'locked', label: 'Locked', disabled: true },
			];

			const wrapper = await renderOpen({ items });

			const checkbox = document.querySelector('[role="menuitemcheckbox"]') as HTMLElement;
			await userEvent.click(checkbox);

			expect(wrapper.emitted('update:selectedValues')).toBeFalsy();
		});

		it('should respect controlled selectedValues', async () => {
			const items: Array<ContextMenuNode<string>> = [
				{ type: 'checkbox', id: 'show-grid', label: 'Show grid' },
				{ type: 'checkbox', id: 'show-minimap', label: 'Show minimap' },
			];

			const wrapper = await renderOpen({
				items,
				selectedValues: ['show-grid'],
			});

			await waitFor(() => {
				const checkboxes = document.querySelectorAll('[role="menuitemcheckbox"]');
				expect(checkboxes[0]).toHaveAttribute('aria-checked', 'true');
				expect(checkboxes[1]).toHaveAttribute('aria-checked', 'false');
			});

			await wrapper.rerender({
				items,
				selectedValues: ['show-grid', 'show-minimap'],
			});

			await waitFor(() => {
				const checkboxes = document.querySelectorAll('[role="menuitemcheckbox"]');
				expect(checkboxes[1]).toHaveAttribute('aria-checked', 'true');
			});
		});
	});

	describe('radios', () => {
		const radioItems: Array<ContextMenuNode<string>> = [
			{
				type: 'radio-group',
				id: 'snap',
				label: 'Snap',
				children: [
					{ type: 'radio', id: 'snap-off', label: 'Off' },
					{ type: 'radio', id: 'snap-grid', label: 'Grid' },
				],
			},
			{
				type: 'radio-group',
				id: 'theme',
				label: 'Theme',
				children: [
					{ type: 'radio', id: 'theme-light', label: 'Light' },
					{ type: 'radio', id: 'theme-dark', label: 'Dark' },
				],
			},
		];

		it('should replace the selected radio in the same group', async () => {
			const wrapper = await renderOpen({
				items: radioItems,
				defaultSelectedValues: ['snap-off', 'theme-light'],
			});

			const grid = document.querySelector(
				'[data-test-id="context-menu-item-snap-grid"]',
			) as HTMLElement;
			await userEvent.click(grid);

			await waitFor(() => {
				const selected = (
					wrapper.emitted('update:selectedValues') as unknown as unknown[][] | undefined
				)?.[0]?.[0];
				expect(selected).toEqual(expect.arrayContaining(['snap-grid', 'theme-light']));
				expect(selected).not.toContain('snap-off');
			});
		});

		it('should select a radio nested in a group', async () => {
			const items: Array<ContextMenuNode<string>> = [
				{
					type: 'group',
					id: 'view',
					children: [
						{
							type: 'radio-group',
							id: 'snap',
							children: [
								{ type: 'radio', id: 'snap-off', label: 'Off' },
								{ type: 'radio', id: 'snap-grid', label: 'Grid' },
							],
						},
					],
				},
			];

			const wrapper = await renderOpen({ items });

			const grid = document.querySelector(
				'[data-test-id="context-menu-item-snap-grid"]',
			) as HTMLElement;
			await userEvent.click(grid);

			await waitFor(() => {
				expect(wrapper.emitted('update:selectedValues')?.[0]).toEqual([['snap-grid']]);
			});
		});

		it('should not select a disabled radio', async () => {
			const items: Array<ContextMenuNode<string>> = [
				{
					type: 'radio-group',
					id: 'snap',
					children: [
						{ type: 'radio', id: 'snap-off', label: 'Off' },
						{ type: 'radio', id: 'snap-guides', label: 'Guides', disabled: true },
					],
				},
			];

			const wrapper = await renderOpen({ items });

			const disabled = document.querySelector(
				'[data-test-id="context-menu-item-snap-guides"]',
			) as HTMLElement;
			await userEvent.click(disabled);

			expect(wrapper.emitted('update:selectedValues')).toBeFalsy();
		});
	});

	describe('loading state', () => {
		it('should show a loading skeleton instead of items', async () => {
			await renderOpen({
				items: createItems(3),
				loading: true,
			});

			expect(document.querySelectorAll('[role="menuitem"]')).toHaveLength(0);
			expect(document.querySelectorAll('[class*="loading"]').length).toBeGreaterThan(0);
		});

		it('should render a custom loading slot', async () => {
			await renderOpen(
				{
					items: [],
					loading: true,
				},
				{
					...defaultSlots,
					loading: '<div data-test-id="custom-loading">Loading…</div>',
				},
			);

			expect(document.querySelector('[data-test-id="custom-loading"]')).toBeInTheDocument();
		});
	});

	describe('empty state', () => {
		it('should show empty state when items array is empty', async () => {
			await renderOpen({ items: [] });

			const { menu } = await getContextMenu();
			expect(menu.textContent).toContain('No items');
		});

		it('should render custom empty slot', async () => {
			await renderOpen(
				{ items: [] },
				{
					...defaultSlots,
					empty: '<div data-test-id="custom-empty">Custom empty message</div>',
				},
			);

			expect(document.querySelector('[data-test-id="custom-empty"]')).toBeInTheDocument();
		});
	});

	describe('disabled state', () => {
		it('should not open when disabled', async () => {
			const wrapper = renderMenu({
				props: {
					items: createItems(3),
					disabled: true,
				},
				slots: defaultSlots,
			});

			await openWithRightClick(wrapper.getByTestId('custom-trigger'));

			expect(document.querySelector('[data-test-id="context-menu"]')).not.toBeInTheDocument();
		});

		it('should not open via the exposed open method when disabled', async () => {
			const menuRef = ref<ContextMenuExposed | null>(null);

			render({
				components: { ContextMenu },
				global: {
					stubs: { N8nKeyboardShortcut: keyboardShortcutStub },
				},
				setup() {
					return { menuRef, items: createItems(3) };
				},
				template: `
					<ContextMenu ref="menuRef" :items="items" disabled>
						<template #trigger>
							<button data-test-id="custom-trigger">Open</button>
						</template>
					</ContextMenu>
				`,
			});

			menuRef.value?.open();

			await waitFor(() => {
				expect(document.querySelector('[data-test-id="context-menu"]')).not.toBeInTheDocument();
			});
		});
	});

	describe('contentClass and id props', () => {
		it('should apply contentClass to the menu content', async () => {
			await renderOpen({
				items: createItems(3),
				contentClass: 'custom-menu-class',
			});

			const { menu } = await getContextMenu();
			expect(menu).toHaveClass('custom-menu-class');
		});

		it('should apply contentClass to submenu panels', async () => {
			await renderOpen({
				items: [
					{
						type: 'submenu',
						id: 'export',
						label: 'Export',
						children: [{ type: 'item', id: 'export-json', label: 'JSON' }],
					},
				],
				contentClass: 'custom-menu-class',
			});

			const trigger = document.querySelector(
				'[data-test-id="context-menu-item-export"]',
			) as HTMLElement;
			await userEvent.hover(trigger);

			await waitFor(() => {
				const panels = document.querySelectorAll('[role="menu"]');
				expect(panels.length).toBe(2);
				panels.forEach((panel) => {
					expect(panel).toHaveClass('custom-menu-class');
				});
			});
		});

		it('should apply id to the menu content', async () => {
			await renderOpen({
				id: 'node-context-menu',
				items: createItems(3),
			});

			const { menu } = await getContextMenu();
			expect(menu).toHaveAttribute('id', 'node-context-menu');
		});
	});

	describe('submenus', () => {
		const submenuItems: Array<ContextMenuNode<string>> = [
			{
				type: 'submenu',
				id: 'export',
				label: 'Export as…',
				children: [
					{ type: 'item', id: 'export-json', label: 'JSON' },
					{
						type: 'submenu',
						id: 'export-csv',
						label: 'CSV',
						children: [
							{ type: 'item', id: 'export-csv-comma', label: 'Comma' },
							{ type: 'item', id: 'export-csv-tab', label: 'Tab' },
						],
					},
				],
			},
		];

		it('should render a submenu trigger with a chevron', async () => {
			await renderOpen({ items: submenuItems });

			expect(document.querySelector('[data-icon="chevron-right"]')).toBeInTheDocument();
			expect(document.body.textContent).toContain('Export as…');
		});

		it('should open a submenu on hover and show children', async () => {
			await renderOpen({ items: submenuItems });

			const trigger = document.querySelector(
				'[data-test-id="context-menu-item-export"]',
			) as HTMLElement;
			await userEvent.hover(trigger);

			await waitFor(() => {
				expect(document.body.textContent).toContain('JSON');
				expect(document.body.textContent).toContain('CSV');
			});
		});

		it('should emit submenu:toggle when a submenu opens', async () => {
			const wrapper = await renderOpen({ items: submenuItems });

			const trigger = document.querySelector(
				'[data-test-id="context-menu-item-export"]',
			) as HTMLElement;
			await userEvent.hover(trigger);

			await waitFor(() => {
				expect(wrapper.emitted('submenu:toggle')).toBeTruthy();
				expect(wrapper.emitted('submenu:toggle')?.[0]).toEqual(['export', true]);
			});
		});

		it('should emit select for a nested submenu item and close the menu', async () => {
			const wrapper = await renderOpen({ items: submenuItems });

			const trigger = document.querySelector(
				'[data-test-id="context-menu-item-export"]',
			) as HTMLElement;
			await userEvent.hover(trigger);

			const json = await waitFor(() => {
				const el = document.querySelector('[data-test-id="context-menu-item-export-json"]');
				if (!el) throw new Error('Nested item not found');
				return el as HTMLElement;
			});
			await userEvent.click(json);

			await waitFor(() => {
				expect(wrapper.emitted('select')?.[0]).toEqual(['export-json']);
			});
			await waitFor(() => {
				expect(document.querySelector('[data-test-id="context-menu"]')).not.toBeInTheDocument();
			});
		});

		it('should show loading state in a lazy submenu', async () => {
			const items: Array<ContextMenuNode<string>> = [
				{
					type: 'submenu',
					id: 'assign',
					label: 'Assign to…',
					loading: true,
					loadingItemCount: 4,
					children: [],
				},
			];

			await renderOpen({ items });

			const trigger = document.querySelector(
				'[data-test-id="context-menu-item-assign"]',
			) as HTMLElement;
			await userEvent.hover(trigger);

			await waitFor(() => {
				const loadingElements = document.querySelectorAll('[class*="loading"]');
				expect(loadingElements.length).toBeGreaterThan(0);
			});
		});
	});

	describe('custom item slots', () => {
		it('should render custom item-leading, item-label, and item-trailing slots', async () => {
			await renderOpen(
				{ items: createItems(1) },
				{
					...defaultSlots,
					'item-leading': '<span data-test-id="custom-leading">Custom</span>',
					'item-label': '<span data-test-id="custom-label">Overridden</span>',
					'item-trailing': '<span data-test-id="custom-trailing">Badge</span>',
				},
			);

			expect(document.querySelector('[data-test-id="custom-leading"]')).toBeInTheDocument();
			expect(document.querySelector('[data-test-id="custom-label"]')).toBeInTheDocument();
			expect(document.querySelector('[data-test-id="custom-trailing"]')).toBeInTheDocument();
		});

		it('should render a custom item slot', async () => {
			await renderOpen(
				{ items: createItems(1) },
				{
					...defaultSlots,
					item: '<div data-test-id="custom-item">Custom row</div>',
				},
			);

			expect(document.querySelector('[data-test-id="custom-item"]')).toBeInTheDocument();
		});
	});

	describe('expose methods', () => {
		it('should expose open method', async () => {
			const menuRef = ref<ContextMenuExposed | null>(null);

			render({
				components: { ContextMenu },
				global: {
					stubs: { N8nKeyboardShortcut: keyboardShortcutStub },
				},
				setup() {
					return { menuRef, items: createItems(3) };
				},
				template: `
					<ContextMenu ref="menuRef" :items="items">
						<template #trigger>
							<button data-test-id="custom-trigger">Open</button>
						</template>
					</ContextMenu>
				`,
			});

			menuRef.value?.open();

			await waitFor(() => {
				expect(document.querySelector('[data-test-id="context-menu"]')).toBeInTheDocument();
			});
		});

		it('should expose close method', async () => {
			const menuRef = ref<ContextMenuExposed | null>(null);
			const open = ref(false);

			render({
				components: { ContextMenu },
				global: {
					stubs: { N8nKeyboardShortcut: keyboardShortcutStub },
				},
				setup() {
					return { menuRef, items: createItems(3), open };
				},
				template: `
					<ContextMenu
						ref="menuRef"
						:items="items"
						:open="open"
						@update:open="open = $event"
					>
						<template #trigger>
							<button data-test-id="custom-trigger">Open</button>
						</template>
					</ContextMenu>
				`,
			});

			menuRef.value?.open();
			await waitFor(() => {
				expect(document.querySelector('[data-test-id="context-menu"]')).toBeInTheDocument();
			});

			menuRef.value?.close();

			await waitFor(() => {
				expect(open.value).toBe(false);
			});
			await waitFor(() => {
				expect(document.querySelector('[data-test-id="context-menu"]')).not.toBeInTheDocument();
			});
		});

		it('should open at the position prop when open is called', async () => {
			const menuRef = ref<ContextMenuExposed | null>(null);
			const dispatchSpy = vi.spyOn(HTMLElement.prototype, 'dispatchEvent');
			const items = createItems(3);
			const position: [number, number] = [120, 80];

			render({
				components: { ContextMenu },
				global: {
					stubs: { N8nKeyboardShortcut: keyboardShortcutStub },
				},
				setup() {
					return { menuRef, items, position };
				},
				template:
					'<ContextMenu ref="menuRef" :items="items" :position="position" :modal="false" />',
			});

			menuRef.value?.open();

			await waitFor(() => {
				expect(document.querySelector('[data-test-id="context-menu"]')).toBeInTheDocument();
			});

			const event = contextMenuEventsFrom(dispatchSpy).at(-1);
			expect(event?.clientX).toBe(120);
			expect(event?.clientY).toBe(80);
		});

		it('should open at the position prop in controlled mode', async () => {
			const dispatchSpy = vi.spyOn(HTMLElement.prototype, 'dispatchEvent');

			renderMenu({
				props: {
					items: createItems(3),
					open: true,
					position: [140, 90],
					modal: false,
				},
			});

			await getContextMenu();

			const event = contextMenuEventsFrom(dispatchSpy).at(-1);
			expect(event?.clientX).toBe(140);
			expect(event?.clientY).toBe(90);
		});

		it('should move to a new position prop while open', async () => {
			const dispatchSpy = vi.spyOn(HTMLElement.prototype, 'dispatchEvent');

			const { rerender } = renderMenu({
				props: {
					items: createItems(3),
					open: true,
					position: [140, 90],
					modal: false,
				},
			});

			await getContextMenu();

			await rerender({
				items: createItems(3),
				open: true,
				position: [200, 150],
				modal: false,
			});

			await waitFor(() => {
				const event = contextMenuEventsFrom(dispatchSpy).at(-1);
				expect(event?.clientX).toBe(200);
				expect(event?.clientY).toBe(150);
			});
		});

		it('should fall back to 0,0 in coordinate mode without a position', async () => {
			const menuRef = ref<ContextMenuExposed | null>(null);
			const dispatchSpy = vi.spyOn(HTMLElement.prototype, 'dispatchEvent');

			render({
				components: { ContextMenu },
				global: {
					stubs: { N8nKeyboardShortcut: keyboardShortcutStub },
				},
				setup() {
					return { menuRef, items: createItems(3) };
				},
				template: '<ContextMenu ref="menuRef" :items="items" :modal="false" />',
			});

			menuRef.value?.open();

			await waitFor(() => {
				expect(document.querySelector('[data-test-id="context-menu"]')).toBeInTheDocument();
			});

			const event = contextMenuEventsFrom(dispatchSpy).at(-1);
			expect(event?.clientX).toBe(0);
			expect(event?.clientY).toBe(0);
		});
	});
});
