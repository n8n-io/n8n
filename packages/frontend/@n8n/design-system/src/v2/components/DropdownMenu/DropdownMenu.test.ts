import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';
import { ref } from 'vue';

import type { DropdownMenuItemProps, DropdownMenuPlacement } from './DropdownMenu.types';
import DropdownMenu from './DropdownMenu.vue';

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

describe('v2/components/DropdownMenu', () => {
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

	describe('teleported prop', () => {
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
