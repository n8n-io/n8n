import userEvent from '@testing-library/user-event';
import { fireEvent, render, waitFor } from '@testing-library/vue';
import { shallowMount } from '@vue/test-utils';
import { DropdownMenuContent } from 'reka-ui';
import { defineComponent, ref } from 'vue';

import type {
	DropdownMenuExposed,
	DropdownMenuItemProps,
	DropdownMenuPlacement,
} from './DropdownMenu.types';
import DropdownMenu from './DropdownMenu.vue';
import Tooltip from '../N8nTooltip/Tooltip.vue';

const createItems = (count: number): DropdownMenuItemProps[] => {
	return Array.from({ length: count }, (_, i) => ({
		id: `item-${i}`,
		label: `Item ${i}`,
	}));
};

async function getDropdownContent() {
	const dropdown = await waitFor(() => {
		const el = document.querySelector('[role="menu"]');
		if (!el) throw new Error('Dropdown not found');
		return el as HTMLElement;
	});

	return { dropdown };
}

function renderExternalDropdown(items: DropdownMenuItemProps[] = createItems(3)) {
	const dropdownRef = ref<DropdownMenuExposed | null>(null);
	const textareaRef = ref<HTMLTextAreaElement | null>(null);
	const isOpen = ref(true);
	const selected: string[] = [];

	const Host = defineComponent({
		components: { DropdownMenu },
		setup() {
			const handleKeydown = (event: KeyboardEvent) => {
				dropdownRef.value?.handleExternalKeydown(event);
			};

			return { dropdownRef, textareaRef, isOpen, items, selected, handleKeydown };
		},
		template: `
			<div>
				<textarea ref="textareaRef" @keydown="handleKeydown" />
				<DropdownMenu
					ref="dropdownRef"
					v-model="isOpen"
					:items="items"
					:external-focus-target="textareaRef"
					searchable
					search-mode="external"
					@select="selected.push($event)"
				/>
				<button>After menu</button>
			</div>
		`,
	});

	return { ...render(Host), dropdownRef, textareaRef, isOpen, selected };
}

describe('N8nDropdownMenu', () => {
	describe('rendering', () => {
		it('should render default trigger button', () => {
			const { container } = render(DropdownMenu, {
				props: {
					items: createItems(3),
				},
			});

			const trigger = container.querySelector('button');
			expect(trigger).toMatchSnapshot();
		});

		it('should render custom trigger via slot', () => {
			const wrapper = render(DropdownMenu, {
				props: {
					items: createItems(3),
				},
				slots: {
					trigger: '<button data-test-id="custom-trigger">Custom Trigger</button>',
				},
			});

			expect(wrapper.getByTestId('custom-trigger')).toBeInTheDocument();
		});

		it('should render with emoji activator', () => {
			const { container } = render(DropdownMenu, {
				props: {
					items: createItems(3),
					activatorIcon: { type: 'emoji', value: '🎉' },
				},
			});

			const trigger = container.querySelector('button');
			expect(trigger).toMatchSnapshot();
		});

		it('should not show dropdown content initially', () => {
			render(DropdownMenu, {
				props: {
					items: createItems(3),
				},
			});

			expect(document.querySelector('[role="menu"]')).not.toBeInTheDocument();
		});
	});

	describe('opening and closing', () => {
		it('should open dropdown on trigger click', async () => {
			const { container } = render(DropdownMenu, {
				props: {
					items: createItems(3),
				},
			});

			const trigger = container.querySelector('button')!;
			await userEvent.click(trigger);

			const { dropdown } = await getDropdownContent();
			expect(dropdown).toBeInTheDocument();
		});

		it('should close dropdown when pressing Escape', async () => {
			const { container } = render(DropdownMenu, {
				props: {
					items: createItems(3),
				},
			});

			const trigger = container.querySelector('button')!;

			await userEvent.click(trigger);
			await waitFor(() => {
				expect(document.querySelector('[role="menu"]')).toBeInTheDocument();
			});

			await userEvent.keyboard('{Escape}');
			await waitFor(() => {
				expect(document.querySelector('[role="menu"]')).not.toBeInTheDocument();
			});
		});

		it('should emit update:modelValue when opening', async () => {
			const wrapper = render(DropdownMenu, {
				props: {
					items: createItems(3),
				},
			});

			const trigger = wrapper.container.querySelector('button')!;
			await userEvent.click(trigger);

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')).toBeTruthy();
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true]);
			});
		});

		it('should emit update:modelValue false when closing', async () => {
			const wrapper = render(DropdownMenu, {
				props: {
					items: createItems(3),
				},
			});

			const trigger = wrapper.container.querySelector('button')!;
			await userEvent.click(trigger);

			await waitFor(() => {
				expect(document.querySelector('[role="menu"]')).toBeInTheDocument();
			});

			await userEvent.keyboard('{Escape}');

			await waitFor(() => {
				const emits = wrapper.emitted('update:modelValue');
				expect(emits).toBeTruthy();
				expect(emits?.[emits.length - 1]).toEqual([false]);
			});
		});

		it('should keep hover dropdown open after leaving the trigger', async () => {
			const { container } = render(DropdownMenu, {
				props: {
					items: createItems(3),
					trigger: 'hover',
				},
			});

			const trigger = container.querySelector('button')!;
			await userEvent.hover(trigger);

			await waitFor(() => {
				expect(document.querySelector('[role="menu"]')).toBeInTheDocument();
			});

			await fireEvent.pointerLeave(trigger);

			expect(document.querySelector('[role="menu"]')).toBeInTheDocument();
		});
	});

	describe('controlled state (v-model)', () => {
		it('should show dropdown when modelValue is true', async () => {
			render(DropdownMenu, {
				props: {
					items: createItems(3),
					modelValue: true,
				},
			});

			await waitFor(() => {
				expect(document.querySelector('[role="menu"]')).toBeInTheDocument();
			});
		});

		it('should hide dropdown when modelValue is false', () => {
			render(DropdownMenu, {
				props: {
					items: createItems(3),
					modelValue: false,
				},
			});

			expect(document.querySelector('[role="menu"]')).not.toBeInTheDocument();
		});

		it('should update visibility when modelValue prop changes', async () => {
			const wrapper = render(DropdownMenu, {
				props: {
					items: createItems(3),
					modelValue: false,
				},
			});

			expect(document.querySelector('[role="menu"]')).not.toBeInTheDocument();

			await wrapper.rerender({ items: createItems(3), modelValue: true });

			await waitFor(() => {
				expect(document.querySelector('[role="menu"]')).toBeInTheDocument();
			});
		});
	});

	describe('items rendering', () => {
		it('should render all items when opened', async () => {
			const items = createItems(3);
			const { container } = render(DropdownMenu, {
				props: {
					items,
				},
			});

			const trigger = container.querySelector('button')!;
			await userEvent.click(trigger);

			await waitFor(() => {
				const menuItems = document.querySelectorAll('[role="menuitem"]');
				expect(menuItems).toHaveLength(3);
			});
		});

		it('should render item labels', async () => {
			const items: DropdownMenuItemProps[] = [
				{ id: '1', label: 'First Option' },
				{ id: '2', label: 'Second Option' },
			];

			const { container } = render(DropdownMenu, {
				props: {
					items,
				},
			});

			const trigger = container.querySelector('button')!;
			await userEvent.click(trigger);

			const { dropdown } = await getDropdownContent();
			expect(dropdown.textContent).toContain('First Option');
			expect(dropdown.textContent).toContain('Second Option');
		});

		it('should render disabled items', async () => {
			const items: DropdownMenuItemProps[] = [
				{ id: '1', label: 'Enabled', disabled: false },
				{ id: '2', label: 'Disabled', disabled: true },
			];

			const { container } = render(DropdownMenu, {
				props: {
					items,
				},
			});

			const trigger = container.querySelector('button')!;
			await userEvent.click(trigger);

			await waitFor(() => {
				const menuItems = document.querySelectorAll('[role="menuitem"]');
				expect(menuItems[1]).toHaveAttribute('data-disabled');
			});
		});
	});

	describe('select event', () => {
		it('should emit select event when item is clicked', async () => {
			const items: DropdownMenuItemProps[] = [
				{ id: 'option-1', label: 'Option 1' },
				{ id: 'option-2', label: 'Option 2' },
			];

			const wrapper = render(DropdownMenu, {
				props: {
					items,
				},
			});

			const trigger = wrapper.container.querySelector('button')!;
			await userEvent.click(trigger);

			await waitFor(() => {
				expect(document.querySelector('[role="menu"]')).toBeInTheDocument();
			});

			const menuItems = document.querySelectorAll('[role="menuitem"]');
			await userEvent.click(menuItems[0]);

			await waitFor(() => {
				expect(wrapper.emitted('select')).toBeTruthy();
				expect(wrapper.emitted('select')?.[0]).toEqual(['option-1']);
			});
		});

		it('should close dropdown after selection', async () => {
			const items: DropdownMenuItemProps[] = [{ id: 'option-1', label: 'Option 1' }];

			const { container } = render(DropdownMenu, {
				props: {
					items,
				},
			});

			const trigger = container.querySelector('button')!;
			await userEvent.click(trigger);

			await waitFor(() => {
				expect(document.querySelector('[role="menu"]')).toBeInTheDocument();
			});

			const menuItem = document.querySelector('[role="menuitem"]')!;
			await userEvent.click(menuItem);

			await waitFor(() => {
				expect(document.querySelector('[role="menu"]')).not.toBeInTheDocument();
			});
		});

		it('should keep the dropdown open after selecting a keepOpen item', async () => {
			const items: DropdownMenuItemProps[] = [{ id: 'toggle', label: 'Toggle', keepOpen: true }];

			const wrapper = render(DropdownMenu, {
				props: {
					items,
				},
			});

			const trigger = wrapper.container.querySelector('button')!;
			await userEvent.click(trigger);

			await waitFor(() => {
				expect(document.querySelector('[role="menu"]')).toBeInTheDocument();
			});

			const menuItem = document.querySelector('[role="menuitem"]')!;
			await userEvent.click(menuItem);

			await waitFor(() => {
				expect(wrapper.emitted('select')?.[0]).toEqual(['toggle']);
			});
			// Still open — the selection did not close the menu.
			expect(document.querySelector('[role="menu"]')).toBeInTheDocument();
		});

		it('should render a header item as a non-interactive label', async () => {
			const items: DropdownMenuItemProps[] = [
				{ id: 'section', label: 'Section title', header: true },
				{ id: 'option-1', label: 'Option 1' },
			];

			const wrapper = render(DropdownMenu, {
				props: {
					items,
				},
			});

			await userEvent.click(wrapper.container.querySelector('button')!);

			await waitFor(() => {
				expect(document.querySelector('[role="menu"]')).toBeInTheDocument();
			});

			// The header text renders...
			expect(document.body.textContent).toContain('Section title');
			// ...but it is not a selectable menu item (only the real option is).
			expect(document.querySelectorAll('[role="menuitem"]')).toHaveLength(1);
		});

		it('should not emit select event for disabled items', async () => {
			const items: DropdownMenuItemProps[] = [
				{ id: 'disabled-item', label: 'Disabled', disabled: true },
			];

			const wrapper = render(DropdownMenu, {
				props: {
					items,
				},
			});

			const trigger = wrapper.container.querySelector('button')!;
			await userEvent.click(trigger);

			await waitFor(() => {
				expect(document.querySelector('[role="menu"]')).toBeInTheDocument();
			});

			const menuItem = document.querySelector('[role="menuitem"]')!;
			await userEvent.click(menuItem);

			await waitFor(() => {
				expect(wrapper.emitted('select')).toBeFalsy();
			});
		});
	});

	describe('loading state', () => {
		it('should show loading skeleton when loading is true', async () => {
			const { container } = render(DropdownMenu, {
				props: {
					items: [],
					loading: true,
					modelValue: true,
				},
			});

			await waitFor(() => {
				const loadingElements = container.ownerDocument.querySelectorAll('[class*="loading"]');
				expect(loadingElements.length).toBeGreaterThan(0);
			});
		});

		it('should show correct number of loading items', async () => {
			render(DropdownMenu, {
				props: {
					items: [],
					loading: true,
					loadingItemCount: 5,
					modelValue: true,
				},
			});

			await waitFor(() => {
				const { dropdown } = document.querySelector('[role="menu"]')
					? { dropdown: document.querySelector('[role="menu"]') }
					: { dropdown: null };
				expect(dropdown).toBeInTheDocument();
			});
		});
	});

	describe('empty state', () => {
		it('should show empty state when items array is empty', async () => {
			render(DropdownMenu, {
				props: {
					items: [],
					modelValue: true,
				},
			});

			await waitFor(() => {
				const dropdown = document.querySelector('[role="menu"]');
				expect(dropdown?.textContent).toContain('No items');
			});
		});

		it('should render custom empty slot', async () => {
			render(DropdownMenu, {
				props: {
					items: [],
					modelValue: true,
				},
				slots: {
					empty: '<div data-test-id="custom-empty">Custom empty message</div>',
				},
			});

			await waitFor(() => {
				const customEmpty = document.querySelector('[data-test-id="custom-empty"]');
				expect(customEmpty).toBeInTheDocument();
			});
		});
	});

	describe('disabled state', () => {
		it('should not open when disabled', async () => {
			const { container } = render(DropdownMenu, {
				props: {
					items: createItems(3),
					disabled: true,
				},
			});

			const trigger = container.querySelector('button')!;
			await userEvent.click(trigger);

			await waitFor(() => {
				expect(document.querySelector('[role="menu"]')).not.toBeInTheDocument();
			});
		});

		it('should render trigger with disabled attribute', () => {
			const { container } = render(DropdownMenu, {
				props: {
					items: createItems(3),
					disabled: true,
				},
			});

			const trigger = container.querySelector('button');
			expect(trigger).toMatchSnapshot();
		});
	});

	describe('content props', function () {
		it('should use the fixed positioning props', function () {
			const wrapper = shallowMount(DropdownMenu, {
				props: {
					items: createItems(3),
					modelValue: true,
					teleported: false,
				},
				global: {
					renderStubDefaultSlot: true,
				},
			});

			expect(wrapper.findComponent(DropdownMenuContent).props()).toMatchObject({
				sideOffset: 4,
				prioritizePosition: false,
			});
		});
	});

	describe('placements', () => {
		const placements: DropdownMenuPlacement[] = [
			'top',
			'top-start',
			'top-end',
			'bottom',
			'bottom-start',
			'bottom-end',
			'left',
			'left-start',
			'left-end',
			'right',
			'right-start',
			'right-end',
		];

		placements.forEach((placement) => {
			it(`should render with placement=${placement}`, async () => {
				const { container } = render(DropdownMenu, {
					props: {
						items: createItems(3),
						placement,
					},
				});

				const trigger = container.querySelector('button')!;
				await userEvent.click(trigger);

				const { dropdown } = await getDropdownContent();
				expect(dropdown).toBeInTheDocument();

				const [expectedSide] = placement.split('-');
				expect(dropdown).toHaveAttribute('data-side', expectedSide);
			});
		});
	});

	describe('maxHeight prop', () => {
		it('should apply maxHeight as number (pixels)', async () => {
			render(DropdownMenu, {
				props: {
					items: createItems(3),
					modelValue: true,
					maxHeight: 200,
				},
			});

			const { dropdown } = await getDropdownContent();
			expect(dropdown).toHaveStyle({ maxHeight: '200px' });
		});

		it('should apply maxHeight as string', async () => {
			render(DropdownMenu, {
				props: {
					items: createItems(3),
					modelValue: true,
					maxHeight: '50vh',
				},
			});

			const { dropdown } = await getDropdownContent();
			expect(dropdown).toHaveStyle({ maxHeight: '50vh' });
		});
	});

	describe('width prop', () => {
		it('should default the content width to 24rem', async () => {
			render(DropdownMenu, {
				props: {
					items: createItems(3),
					modelValue: true,
				},
			});

			const { dropdown } = await getDropdownContent();
			expect(dropdown).toHaveStyle({ '--n8n--dropdown-menu-width': '24rem' });
		});

		it('should apply a custom width value', async () => {
			render(DropdownMenu, {
				props: {
					items: createItems(3),
					modelValue: true,
					width: '10rem',
				},
			});

			const { dropdown } = await getDropdownContent();
			expect(dropdown).toHaveStyle({ '--n8n--dropdown-menu-width': '10rem' });
		});
	});

	describe('teleported prop', () => {
		it('should render a teleported tooltip outside the dropdown content', async () => {
			render({
				components: { DropdownMenu, Tooltip },
				setup() {
					return {
						items: [{ id: 'item', label: 'Item' }],
					};
				},
				template: `
					<DropdownMenu :items="items" :model-value="true">
						<template #item-label="{ item }">
							<Tooltip content="Item details" :visible="true" teleported>
								<span>{{ item.label }}</span>
							</Tooltip>
						</template>
					</DropdownMenu>
				`,
			});

			const { dropdown } = await getDropdownContent();
			const tooltip = await waitFor(() => {
				const element = document.querySelector('[data-test-id="tooltip-content"]');
				expect(element).toBeInTheDocument();
				return element as HTMLElement;
			});

			expect(dropdown).not.toContainElement(tooltip);
			expect(document.body).toContainElement(tooltip);
		});

		it('should teleport to body by default', async () => {
			const { container } = render(DropdownMenu, {
				props: {
					items: createItems(3),
					modelValue: true,
				},
			});

			await waitFor(() => {
				const dropdown = document.querySelector('[role="menu"]');
				expect(dropdown).toBeInTheDocument();
				expect(container.querySelector('[role="menu"]')).toBeNull();
			});
		});

		it('should not teleport when teleported is false', async () => {
			const { container } = render(DropdownMenu, {
				props: {
					items: createItems(3),
					modelValue: true,
					teleported: false,
				},
			});

			await waitFor(() => {
				const dropdown = document.querySelector('[role="menu"]');
				expect(dropdown).toBeInTheDocument();
				expect(container.querySelector('[role="menu"]')).not.toBeNull();
			});
		});
	});

	describe('searchable', () => {
		it('should render search input when searchable is true', async () => {
			render(DropdownMenu, {
				props: {
					items: createItems(3),
					modelValue: true,
					searchable: true,
				},
			});

			await waitFor(() => {
				const searchInput = document.querySelector('input[type="text"]');
				expect(searchInput).toBeInTheDocument();
			});
		});

		it('should emit search event when typing in search', async () => {
			vi.useFakeTimers();

			const wrapper = render(DropdownMenu, {
				props: {
					items: createItems(3),
					modelValue: true,
					searchable: true,
					searchDebounce: 100,
				},
			});

			await waitFor(() => {
				expect(document.querySelector('input[type="text"]')).toBeInTheDocument();
			});

			const searchInput = document.querySelector('input[type="text"]')!;
			await userEvent.type(searchInput, 'test', { delay: null });

			await vi.advanceTimersByTimeAsync(150);

			await waitFor(() => {
				expect(wrapper.emitted('search')).toBeTruthy();
			});

			vi.useRealTimers();
		});

		it('should render search placeholder', async () => {
			render(DropdownMenu, {
				props: {
					items: createItems(3),
					modelValue: true,
					searchable: true,
					searchPlaceholder: 'Search items...',
				},
			});

			await waitFor(() => {
				const searchInput = document.querySelector('input[type="text"]');
				expect(searchInput).toHaveAttribute('placeholder', 'Search items...');
			});
		});

		it('should keep the dropdown open when a keepOpen item is selected with the keyboard', async () => {
			const items: DropdownMenuItemProps[] = [{ id: 'toggle', label: 'Toggle', keepOpen: true }];

			const wrapper = render(DropdownMenu, {
				props: { items, modelValue: true, searchable: true },
			});

			await waitFor(() => {
				expect(document.querySelector('input[type="text"]')).toBeInTheDocument();
			});

			(document.querySelector('input[type="text"]') as HTMLElement).focus();
			await userEvent.keyboard('{ArrowDown}'); // highlight the item
			await userEvent.keyboard('{Enter}'); // select via keyboard

			await waitFor(() => {
				expect(wrapper.emitted('select')?.[0]).toEqual(['toggle']);
			});
			// Still open — keyboard select honors keepOpen, matching click.
			expect(document.querySelector('[role="menu"]')).toBeInTheDocument();
		});

		it('should close the dropdown when a normal item is selected with the keyboard', async () => {
			const items: DropdownMenuItemProps[] = [{ id: 'plain', label: 'Plain' }];

			const wrapper = render(DropdownMenu, {
				props: { items, modelValue: true, searchable: true },
			});

			await waitFor(() => {
				expect(document.querySelector('input[type="text"]')).toBeInTheDocument();
			});

			(document.querySelector('input[type="text"]') as HTMLElement).focus();
			await userEvent.keyboard('{ArrowDown}');
			await userEvent.keyboard('{Enter}');

			await waitFor(() => {
				expect(wrapper.emitted('select')?.[0]).toEqual(['plain']);
			});
			await waitFor(() => {
				expect(document.querySelector('[role="menu"]')).not.toBeInTheDocument();
			});
		});

		it('should skip section headers during keyboard navigation and never select them', async () => {
			const items: DropdownMenuItemProps[] = [
				{ id: 'section', label: 'Section', header: true },
				{ id: 'option', label: 'Option' },
			];

			const wrapper = render(DropdownMenu, {
				props: { items, modelValue: true, searchable: true },
			});

			await waitFor(() => {
				expect(document.querySelector('input[type="text"]')).toBeInTheDocument();
			});

			(document.querySelector('input[type="text"]') as HTMLElement).focus();
			// First ArrowDown skips the header and lands on the real option.
			await userEvent.keyboard('{ArrowDown}');
			await userEvent.keyboard('{Enter}');

			await waitFor(() => {
				expect(wrapper.emitted('select')?.[0]).toEqual(['option']);
			});
			// The header id is never emitted as a selection.
			expect(wrapper.emitted('select')?.flat()).not.toContain('section');
		});
	});

	describe('external search mode', () => {
		it('should keep focus in the external textarea without rendering an internal search input', async () => {
			const wrapper = renderExternalDropdown();
			const textarea = wrapper.getByRole('textbox');

			await getDropdownContent();
			await waitFor(() => expect(document.activeElement).toBe(textarea));
			expect(document.querySelector('input[type="text"]')).not.toBeInTheDocument();

			const firstItem = document.querySelector('[role="menuitem"]')!;
			await fireEvent.pointerMove(firstItem);
			await waitFor(() => expect(document.activeElement).toBe(textarea));

			await userEvent.click(textarea);
			expect(document.querySelector('[role="menu"]')).toBeInTheDocument();
		});

		it('should navigate and select from the external textarea', async () => {
			const wrapper = renderExternalDropdown();
			const textarea = wrapper.getByRole('textbox');
			await waitFor(() => expect(document.activeElement).toBe(textarea));

			await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowUp}');

			const firstItem = document.querySelectorAll('[role="menuitem"]')[0];
			expect(firstItem).toHaveAttribute('aria-selected', 'true');
			expect(textarea).toHaveAttribute('aria-activedescendant', firstItem.id);
			expect(document.activeElement).toBe(textarea);

			await userEvent.keyboard('{Enter}');

			expect(wrapper.selected).toEqual(['item-0']);
			await waitFor(() => {
				expect(document.querySelector('[role="menu"]')).not.toBeInTheDocument();
				expect(document.activeElement).toBe(textarea);
			});
		});

		it('should leave unhandled editing keys available to the textarea', async () => {
			const wrapper = renderExternalDropdown();
			await waitFor(() => expect(wrapper.dropdownRef.value).not.toBeNull());

			const enterEvent = new KeyboardEvent('keydown', {
				key: 'Enter',
				cancelable: true,
			});
			expect(wrapper.dropdownRef.value?.handleExternalKeydown(enterEvent)).toBe(false);
			expect(enterEvent.defaultPrevented).toBe(false);

			wrapper.dropdownRef.value?.highlightFirstItem();
			const shiftEnterEvent = new KeyboardEvent('keydown', {
				key: 'Enter',
				shiftKey: true,
				cancelable: true,
			});
			expect(wrapper.dropdownRef.value?.handleExternalKeydown(shiftEnterEvent)).toBe(false);
			expect(wrapper.selected).toEqual([]);

			const consumedEvent = new KeyboardEvent('keydown', {
				key: 'ArrowDown',
				cancelable: true,
			});
			consumedEvent.preventDefault();
			expect(wrapper.dropdownRef.value?.handleExternalKeydown(consumedEvent)).toBe(false);
		});

		it('should leave arrow keys available when the menu has no navigable items', async () => {
			const wrapper = renderExternalDropdown([]);
			await waitFor(() => expect(wrapper.dropdownRef.value).not.toBeNull());
			const arrowDownEvent = new KeyboardEvent('keydown', {
				key: 'ArrowDown',
				cancelable: true,
			});

			expect(wrapper.dropdownRef.value?.handleExternalKeydown(arrowDownEvent)).toBe(false);
			expect(arrowDownEvent.defaultPrevented).toBe(false);
		});

		it('should stop handled keys from reaching the chat input', async () => {
			const wrapper = renderExternalDropdown();
			await waitFor(() => expect(wrapper.dropdownRef.value).not.toBeNull());
			const arrowDownEvent = new KeyboardEvent('keydown', {
				key: 'ArrowDown',
				cancelable: true,
			});
			const stopPropagation = vi.spyOn(arrowDownEvent, 'stopPropagation');

			expect(wrapper.dropdownRef.value?.handleExternalKeydown(arrowDownEvent)).toBe(true);
			expect(stopPropagation).toHaveBeenCalled();
		});

		it('should open and close a selectable parent sub-menu with external arrow keys', async () => {
			const wrapper = renderExternalDropdown([
				{
					id: 'parent',
					label: 'Parent',
					selectable: true,
					children: [{ id: 'child', label: 'Child' }],
				},
			]);
			const textarea = wrapper.getByRole('textbox');
			await waitFor(() => expect(document.activeElement).toBe(textarea));

			await userEvent.keyboard('{ArrowDown}{ArrowRight}');
			await waitFor(() => expect(document.querySelectorAll('[role="menu"]')).toHaveLength(2));

			await userEvent.keyboard('{ArrowDown}');
			const child = wrapper.getByText('Child').closest('[role="menuitem"]');
			expect(child).toHaveAttribute('aria-selected', 'true');
			expect(document.activeElement).toBe(textarea);

			await userEvent.keyboard('{ArrowLeft}');
			await waitFor(() => expect(document.querySelectorAll('[role="menu"]')).toHaveLength(1));
			expect(wrapper.getByText('Parent').closest('[role="menuitem"]')).toHaveAttribute(
				'aria-selected',
				'true',
			);

			await userEvent.keyboard('{Enter}');
			expect(wrapper.selected).toEqual(['parent']);
		});

		it('should close on Escape and restore textarea focus', async () => {
			const wrapper = renderExternalDropdown();
			const textarea = wrapper.getByRole('textbox');
			await waitFor(() => expect(document.activeElement).toBe(textarea));

			await userEvent.keyboard('{Escape}');

			await waitFor(() => {
				expect(document.querySelector('[role="menu"]')).not.toBeInTheDocument();
				expect(document.activeElement).toBe(textarea);
			});
		});

		it('should close on Tab without keeping focus in the textarea', async () => {
			const wrapper = renderExternalDropdown();
			const textarea = wrapper.getByRole('textbox');
			await waitFor(() => expect(document.activeElement).toBe(textarea));

			await userEvent.tab();

			await waitFor(() => expect(document.querySelector('[role="menu"]')).not.toBeInTheDocument());
			expect(document.activeElement).not.toBe(textarea);
		});

		it('should ignore keys during IME composition', async () => {
			const wrapper = renderExternalDropdown();
			const textarea = wrapper.getByRole('textbox');
			await waitFor(() => expect(document.activeElement).toBe(textarea));

			textarea.dispatchEvent(
				new KeyboardEvent('keydown', {
					key: 'Enter',
					isComposing: true,
					bubbles: true,
					cancelable: true,
				}),
			);

			expect(wrapper.selected).toEqual([]);
			expect(document.querySelector('[role="menu"]')).toBeInTheDocument();
		});
	});

	describe('custom content slot', () => {
		it('should render custom content via slot', async () => {
			render(DropdownMenu, {
				props: {
					items: createItems(3),
					modelValue: true,
				},
				slots: {
					content: '<div data-test-id="custom-content">Custom dropdown content</div>',
				},
			});

			await waitFor(() => {
				const customContent = document.querySelector('[data-test-id="custom-content"]');
				expect(customContent).toBeInTheDocument();
			});
		});
	});

	describe('extraPopperClass prop', () => {
		it('should apply extra class to dropdown content', async () => {
			render(DropdownMenu, {
				props: {
					items: createItems(3),
					modelValue: true,
					extraPopperClass: 'custom-dropdown-class',
				},
			});

			const { dropdown } = await getDropdownContent();
			expect(dropdown).toHaveClass('custom-dropdown-class');
		});
	});

	describe('expose methods', () => {
		it('should expose open method', async () => {
			const dropdownRef = ref<{ open: () => void; close: () => void } | null>(null);

			render({
				components: { DropdownMenu },
				setup() {
					return { dropdownRef, items: createItems(3) };
				},
				template: '<DropdownMenu ref="dropdownRef" :items="items" />',
			});

			dropdownRef.value?.open();

			await waitFor(() => {
				expect(document.querySelector('[role="menu"]')).toBeInTheDocument();
			});
		});

		it('should expose close method', async () => {
			const dropdownRef = ref<{ open: () => void; close: () => void } | null>(null);
			const modelValue = ref(true);

			render({
				components: { DropdownMenu },
				setup() {
					return { dropdownRef, items: createItems(3), modelValue };
				},
				template:
					'<DropdownMenu ref="dropdownRef" :items="items" v-model="modelValue" @update:modelValue="$emit(\'update:modelValue\', $event)" />',
			});

			await waitFor(() => {
				expect(document.querySelector('[role="menu"]')).toBeInTheDocument();
			});

			dropdownRef.value?.close();

			await waitFor(() => {
				expect(modelValue.value).toBe(false);
			});
		});
	});
});
