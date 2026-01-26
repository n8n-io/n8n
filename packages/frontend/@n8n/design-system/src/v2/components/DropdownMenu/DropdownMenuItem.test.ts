import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';
import { DropdownMenuRoot, DropdownMenuContent } from 'reka-ui';

import type { DropdownMenuItemProps } from './DropdownMenu.types';
import DropdownMenuItem from './DropdownMenuItem.vue';

/**
 * Helper to render DropdownMenuItem within required reka-ui context
 */
function renderMenuItem<T = string>(
	itemProps: DropdownMenuItemProps<T>,
	options: { slots?: Record<string, string> } = {},
) {
	return render({
		components: { DropdownMenuRoot, DropdownMenuContent, DropdownMenuItem },
		setup() {
			return { itemProps };
		},
		template: `
			<DropdownMenuRoot :open="true">
				<DropdownMenuContent>
					<DropdownMenuItem v-bind="itemProps">
						${options.slots?.['item-leading'] ? `<template #item-leading="slotProps">${options.slots['item-leading']}</template>` : ''}
						${options.slots?.['item-label'] ? `<template #item-label="slotProps">${options.slots['item-label']}</template>` : ''}
						${options.slots?.['item-trailing'] ? `<template #item-trailing="slotProps">${options.slots['item-trailing']}</template>` : ''}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenuRoot>
		`,
	});
}

describe('v2/components/DropdownMenuItem', () => {
	describe('rendering', () => {
		it('should render item with label', async () => {
			renderMenuItem({ id: 'test', label: 'Test Item' });

			await waitFor(() => {
				const item = document.querySelector('[role="menuitem"]');
				expect(item).toMatchSnapshot();
			});
		});

		it('should render item with icon', async () => {
			renderMenuItem({
				id: 'test',
				label: 'With Icon',
				icon: { type: 'icon', value: 'user' },
			});

			await waitFor(() => {
				const item = document.querySelector('[role="menuitem"]');
				expect(item).toMatchSnapshot();
			});
		});

		it('should render item with emoji', async () => {
			renderMenuItem({
				id: 'test',
				label: 'With Emoji',
				icon: { type: 'emoji', value: '🎉' },
			});

			await waitFor(() => {
				const item = document.querySelector('[role="menuitem"]');
				expect(item).toMatchSnapshot();
			});
		});

		it('should render disabled item', async () => {
			renderMenuItem({
				id: 'test',
				label: 'Disabled Item',
				disabled: true,
			});

			await waitFor(() => {
				const item = document.querySelector('[role="menuitem"]');
				expect(item).toMatchSnapshot();
			});
		});

		it('should render checked item with checkmark', async () => {
			renderMenuItem({
				id: 'test',
				label: 'Checked Item',
				checked: true,
			});

			await waitFor(() => {
				const item = document.querySelector('[role="menuitem"]');
				expect(item).toMatchSnapshot();
			});
		});

		it('should render separator when divided is true', async () => {
			renderMenuItem({
				id: 'test',
				label: 'Divided Item',
				divided: true,
			});

			await waitFor(() => {
				// Snapshot the wrapper which includes the separator
				const wrapper = document.querySelector('[role="menuitem"]')?.parentElement;
				expect(wrapper).toMatchSnapshot();
			});
		});

		it('should render highlighted item', async () => {
			renderMenuItem({
				id: 'test',
				label: 'Highlighted Item',
				highlighted: true,
			});

			await waitFor(() => {
				const item = document.querySelector('[role="menuitem"]');
				expect(item).toMatchSnapshot();
			});
		});

		it('should render item with custom class', async () => {
			renderMenuItem({
				id: 'test',
				label: 'Custom Class',
				class: 'my-custom-class',
			});

			await waitFor(() => {
				const item = document.querySelector('[role="menuitem"]');
				expect(item).toHaveClass('my-custom-class');
			});
		});

		it('should render sub-menu trigger when has children', async () => {
			renderMenuItem({
				id: 'parent',
				label: 'Parent Item',
				children: [
					{ id: 'child-1', label: 'Child 1' },
					{ id: 'child-2', label: 'Child 2' },
				],
			});

			await waitFor(() => {
				const trigger = document.querySelector('[role="menuitem"]');
				expect(trigger).toMatchSnapshot();
			});
		});
	});

	describe('select event', () => {
		it('should emit select event when clicked', async () => {
			const wrapper = render({
				components: { DropdownMenuRoot, DropdownMenuContent, DropdownMenuItem },
				template: `
					<DropdownMenuRoot :open="true">
						<DropdownMenuContent>
							<DropdownMenuItem id="item-1" label="Click Me" @select="$emit('select', $event)" />
						</DropdownMenuContent>
					</DropdownMenuRoot>
				`,
			});

			await waitFor(() => {
				expect(document.querySelector('[role="menuitem"]')).toBeInTheDocument();
			});

			const item = document.querySelector('[role="menuitem"]')!;
			await userEvent.click(item);

			await waitFor(() => {
				expect(wrapper.emitted('select')).toBeTruthy();
				expect(wrapper.emitted('select')?.[0]).toEqual(['item-1']);
			});
		});

		it('should not emit select event for disabled items', async () => {
			const wrapper = render({
				components: { DropdownMenuRoot, DropdownMenuContent, DropdownMenuItem },
				template: `
					<DropdownMenuRoot :open="true">
						<DropdownMenuContent>
							<DropdownMenuItem id="disabled-item" label="Disabled" :disabled="true" @select="$emit('select', $event)" />
						</DropdownMenuContent>
					</DropdownMenuRoot>
				`,
			});

			await waitFor(() => {
				expect(document.querySelector('[role="menuitem"]')).toBeInTheDocument();
			});

			const item = document.querySelector('[role="menuitem"]')!;
			await userEvent.click(item);

			await waitFor(() => {
				expect(wrapper.emitted('select')).toBeFalsy();
			});
		});

		it('should not emit select event for items with sub-menu', async () => {
			const wrapper = render({
				components: { DropdownMenuRoot, DropdownMenuContent, DropdownMenuItem },
				template: `
					<DropdownMenuRoot :open="true">
						<DropdownMenuContent>
							<DropdownMenuItem
								id="parent"
								label="Parent"
								:children="[{ id: 'child', label: 'Child' }]"
								@select="$emit('select', $event)"
							/>
						</DropdownMenuContent>
					</DropdownMenuRoot>
				`,
			});

			await waitFor(() => {
				expect(document.querySelector('[role="menuitem"]')).toBeInTheDocument();
			});

			const item = document.querySelector('[role="menuitem"]')!;
			await userEvent.click(item);

			// Parent items with children should not emit select directly
			await waitFor(() => {
				expect(wrapper.emitted('select')).toBeFalsy();
			});
		});
	});

	describe('sub-menu', () => {
		it('should render as sub-menu trigger when loading is true', async () => {
			renderMenuItem({
				id: 'loading-parent',
				label: 'Loading Parent',
				loading: true,
			});

			await waitFor(() => {
				const chevron = document.querySelector('[data-icon="chevron-right"]');
				expect(chevron).toBeInTheDocument();
			});
		});

		it('should render as sub-menu trigger when searchable is true', async () => {
			renderMenuItem({
				id: 'searchable-parent',
				label: 'Searchable Parent',
				searchable: true,
			});

			await waitFor(() => {
				const chevron = document.querySelector('[data-icon="chevron-right"]');
				expect(chevron).toBeInTheDocument();
			});
		});

		it('should open sub-menu on hover and show children', async () => {
			renderMenuItem({
				id: 'parent',
				label: 'Parent Item',
				children: [
					{ id: 'child-1', label: 'Child 1' },
					{ id: 'child-2', label: 'Child 2' },
				],
			});

			await waitFor(() => {
				expect(document.querySelector('[data-icon="chevron-right"]')).toBeInTheDocument();
			});

			const trigger = document.querySelector('[role="menuitem"]')!;
			await userEvent.hover(trigger);

			await waitFor(() => {
				const subMenuItems = document.querySelectorAll('[role="menu"] [role="menuitem"]');
				expect(subMenuItems.length).toBeGreaterThanOrEqual(2);
			});
		});

		it('should show loading state in sub-menu', async () => {
			renderMenuItem({
				id: 'loading-parent',
				label: 'Loading Parent',
				loading: true,
				loadingItemCount: 3,
			});

			await waitFor(() => {
				expect(document.querySelector('[data-icon="chevron-right"]')).toBeInTheDocument();
			});

			const trigger = document.querySelector('[role="menuitem"]')!;
			await userEvent.hover(trigger);

			await waitFor(() => {
				const loadingElements = document.querySelectorAll('[class*="loading"]');
				expect(loadingElements.length).toBeGreaterThan(0);
			});
		});

		it('should show search input in searchable sub-menu', async () => {
			renderMenuItem({
				id: 'searchable-parent',
				label: 'Searchable Parent',
				searchable: true,
				children: [{ id: 'child-1', label: 'Child 1' }],
			});

			await waitFor(() => {
				expect(document.querySelector('[data-icon="chevron-right"]')).toBeInTheDocument();
			});

			const trigger = document.querySelector('[role="menuitem"]')!;
			await userEvent.hover(trigger);

			await waitFor(() => {
				const searchInput = document.querySelector('input[type="text"]');
				expect(searchInput).toBeInTheDocument();
			});
		});

		it('should emit update:subMenuOpen when sub-menu opens', async () => {
			const wrapper = render({
				components: { DropdownMenuRoot, DropdownMenuContent, DropdownMenuItem },
				template: `
					<DropdownMenuRoot :open="true">
						<DropdownMenuContent>
							<DropdownMenuItem
								id="parent"
								label="Parent"
								:children="[{ id: 'child', label: 'Child' }]"
								@update:sub-menu-open="$emit('update:subMenuOpen', $event)"
							/>
						</DropdownMenuContent>
					</DropdownMenuRoot>
				`,
			});

			await waitFor(() => {
				expect(document.querySelector('[data-icon="chevron-right"]')).toBeInTheDocument();
			});

			const trigger = document.querySelector('[role="menuitem"]')!;
			await userEvent.hover(trigger);

			await waitFor(() => {
				expect(wrapper.emitted('update:subMenuOpen')).toBeTruthy();
				expect(wrapper.emitted('update:subMenuOpen')?.[0]).toEqual([true]);
			});
		});
	});

	describe('slots', () => {
		it('should render custom item-leading slot', async () => {
			renderMenuItem(
				{ id: 'test', label: 'Custom Leading' },
				{
					slots: {
						'item-leading': '<span data-test-id="custom-leading">Custom</span>',
					},
				},
			);

			await waitFor(() => {
				const customLeading = document.querySelector('[data-test-id="custom-leading"]');
				expect(customLeading).toBeInTheDocument();
			});
		});

		it('should render custom item-trailing slot', async () => {
			renderMenuItem(
				{ id: 'test', label: 'Custom Trailing' },
				{
					slots: {
						'item-trailing': '<span data-test-id="custom-trailing">Badge</span>',
					},
				},
			);

			await waitFor(() => {
				const customTrailing = document.querySelector('[data-test-id="custom-trailing"]');
				expect(customTrailing).toBeInTheDocument();
			});
		});
	});
});
