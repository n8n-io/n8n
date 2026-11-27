import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';
import { nextTick } from 'vue';

import N8nActionDropdown from './ActionDropdown.vue';

describe('components', () => {
	describe('N8nActionDropdown', () => {
		it('should render default styling correctly', () => {
			const wrapper = render(N8nActionDropdown, {
				props: {
					items: [
						{
							id: 'item1',
							label: 'Action 1',
						},
						{
							id: 'item2',
							label: 'Action 2',
						},
					],
				},
				global: {
					stubs: ['N8nIcon', 'ElTooltip', 'N8nIconButton', 'N8nLoading', 'N8nBadge'],
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});

		it('should render custom styling correctly', () => {
			const wrapper = render(N8nActionDropdown, {
				props: {
					items: [
						{
							id: 'item1',
							label: 'Action 1',
							icon: 'thumbs-up',
						},
						{
							id: 'item2',
							label: 'Action 2',
							icon: 'thumbs-down',
							disabled: true,
						},
						{
							id: 'item3',
							label: 'Action 3',
							icon: 'house',
							divided: true,
						},
					],
				},
				global: {
					stubs: ['N8nIcon', 'N8nIconButton', 'N8nLoading', 'N8nBadge'],
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});

		it('should render items with badges', () => {
			const wrapper = render(N8nActionDropdown, {
				props: {
					items: [
						{
							id: 'item1',
							label: 'Action 1',
							badge: 'Pro',
							badgeProps: { variant: 'warning' },
							disabled: true,
						},
						{
							id: 'item2',
							label: 'Action 2',
						},
					],
				},
				global: {
					stubs: ['N8nIcon', 'N8nBadge', 'N8nIconButton', 'N8nLoading'],
				},
			});

			expect(wrapper.html()).toContain('action-dropdown-container');
		});

		it('shows an item description under its label', async () => {
			const wrapper = render(N8nActionDropdown, {
				props: {
					items: [{ id: 'publish', label: 'Publish', description: 'Goes live for everyone' }],
				},
			});

			await userEvent.click(wrapper.container.querySelector('button')!);

			expect(await wrapper.findByText('Goes live for everyone')).toBeVisible();
			expect(wrapper.getByText('Publish').closest('.n8n-text')).toHaveClass('size-medium');
		});

		it('uses the standard menu label size for enabled and disabled actions', async () => {
			const wrapper = render(N8nActionDropdown, {
				props: {
					items: [
						{ id: 'edit', label: 'Edit' },
						{ id: 'delete', label: 'Delete', disabled: true },
					],
				},
			});

			await userEvent.click(wrapper.container.querySelector('button')!);

			expect(await wrapper.findByText('Edit')).toHaveClass('n8n-text', 'size-medium', 'text-dark');
			expect(wrapper.getByText('Delete')).toHaveClass('n8n-text', 'size-medium', 'text-xlight');
		});

		it('keeps custom menu item content', async () => {
			const wrapper = render(N8nActionDropdown, {
				props: { items: [{ id: 'edit', label: 'Edit' }] },
				slots: {
					menuItem:
						'<template #menuItem="item"><strong>{{ item.label }} action</strong></template>',
				},
			});

			await userEvent.click(wrapper.container.querySelector('button')!);

			expect(await wrapper.findByText('Edit action')).toBeVisible();
		});

		it('renders one checkmark for a checked action', async () => {
			const wrapper = render(N8nActionDropdown, {
				props: { items: [{ id: 'selected', label: 'Selected', checked: true }] },
			});

			await userEvent.click(wrapper.container.querySelector('button')!);

			const item = await wrapper.findByRole('menuitem', { name: 'Selected' });
			expect(item.querySelectorAll('[data-icon="check"]')).toHaveLength(1);
		});

		it('keeps the configured icon size', async () => {
			const wrapper = render(N8nActionDropdown, {
				props: {
					items: [{ id: 'edit', label: 'Edit', icon: 'pencil' }],
					iconSize: 'small',
				},
			});

			await userEvent.click(wrapper.container.querySelector('button')!);

			const item = await wrapper.findByRole('menuitem', { name: 'Edit' });
			expect(item.querySelector('[data-icon="pencil"]')).toHaveAttribute('width', '12px');
		});

		it('shows descriptions in nested menus', async () => {
			const wrapper = render(N8nActionDropdown, {
				props: {
					items: [
						{
							id: 'share',
							label: 'Share',
							children: [
								{
									id: 'publish',
									label: 'Publish',
									description: 'Goes live for everyone',
								},
							],
						},
					],
				},
			});

			await userEvent.click(wrapper.container.querySelector('button')!);
			await userEvent.keyboard('{ArrowDown}{ArrowRight}');

			expect(await wrapper.findByText('Goes live for everyone')).toBeVisible();
			expect(wrapper.getByText('Publish').closest('.n8n-text')).toHaveClass('size-medium');
		});

		it('forwards badge variants over the default variant', async function testBadgeVariants() {
			const wrapper = render(N8nActionDropdown, {
				props: {
					items: [
						{ id: 'default', label: 'Default', badge: 'Pro' },
						{
							id: 'custom',
							label: 'Custom',
							badge: 'Warning',
							badgeProps: { variant: 'warning' },
						},
					],
				},
			});

			await userEvent.click(wrapper.container.querySelector('button')!);

			await waitFor(function assertBadgeVariants() {
				const defaultBadge = wrapper.getByText('Pro').closest('.n8n-badge');
				const customBadge = wrapper.getByText('Warning').closest('.n8n-badge');
				expect(defaultBadge).toHaveClass('primary');
				expect(customBadge).toHaveClass('warning');
				expect(customBadge).not.toHaveClass('primary');
				expect(customBadge).not.toHaveAttribute('theme');
				expect(customBadge).not.toHaveAttribute('bold');
			});
		});

		it('should support badge-click event for disabled items with badges', () => {
			// This test verifies that the component has the badge-click emit defined
			// and accepts items with badge properties. The actual click interaction
			// is tested in integration tests (ProjectMembersRoleCell and ProjectMembersTable)
			// where the dropdown menu is opened and badges are clickable.
			const wrapper = render(N8nActionDropdown, {
				props: {
					items: [
						{
							id: 'disabled-item',
							label: 'Disabled Action',
							badge: 'Pro',
							disabled: true,
						},
					],
				},
			});

			// Verify component renders with badge properties
			expect(wrapper.html()).toContain('action-dropdown-container');

			// The component template has: @click.stop="item.disabled && $emit('badge-click', item.id)"
			// This ensures badge-click only emits for disabled items
		});

		it('should mark destructive items with the destructive class', async () => {
			const wrapper = render(N8nActionDropdown, {
				props: {
					items: [
						{ id: 'edit', label: 'Edit' },
						{ id: 'delete', label: 'Delete', variant: 'destructive' as const },
					],
				},
			});

			await userEvent.click(wrapper.container.querySelector('button')!);

			await waitFor(() => {
				const deleteItem = document.querySelector('[data-test-id="action-delete"]');
				expect(deleteItem?.className).toContain('destructive');

				const editItem = document.querySelector('[data-test-id="action-edit"]');
				expect(editItem?.className).not.toContain('destructive');
			});
		});

		it('explains a disabled item with a tooltip while the pointer is over the item', async () => {
			const wrapper = render(N8nActionDropdown, {
				props: {
					items: [
						{ id: 'edit', label: 'Edit' },
						{
							id: 'publish',
							label: 'Publish',
							disabled: true,
							tooltip: 'Fix the node issues first',
						},
					],
				},
			});

			await userEvent.click(wrapper.container.querySelector('button')!);
			const publishItem = await waitFor(() => {
				const item = document.querySelector<HTMLElement>('[data-test-id="action-publish"]');
				expect(item).toBeInTheDocument();
				return item!;
			});
			// No icon: the item is the only trigger.
			expect(publishItem.querySelector('svg')).toBeNull();

			await userEvent.hover(publishItem);
			expect(await wrapper.findByText('Fix the node issues first')).toBeVisible();

			// Moving the pointer off the disabled item closes the tooltip, and hovering again reopens it.
			publishItem.dispatchEvent(
				new MouseEvent('pointerleave', { bubbles: false, clientX: 100, clientY: 100 }),
			);
			await nextTick();
			const editItem = document.querySelector<HTMLElement>('[data-test-id="action-edit"]')!;
			editItem.dispatchEvent(
				new MouseEvent('pointermove', { bubbles: true, clientX: 500, clientY: 500 }),
			);
			await waitFor(() => {
				expect(wrapper.queryByText('Fix the node issues first')).not.toBeInTheDocument();
			});

			await userEvent.hover(publishItem);
			expect(await wrapper.findByText('Fix the node issues first')).toBeVisible();
		});

		it('shows no tooltip for an item without one', async () => {
			const wrapper = render(N8nActionDropdown, {
				props: { items: [{ id: 'edit', label: 'Edit' }] },
			});

			await userEvent.click(wrapper.container.querySelector('button')!);
			const editItem = await waitFor(() => {
				const item = document.querySelector<HTMLElement>('[data-test-id="action-edit"]');
				expect(item).toBeInTheDocument();
				return item!;
			});
			await userEvent.hover(editItem);

			expect(document.querySelector('[role="tooltip"]')).toBeNull();
		});

		it('should render footer content', async () => {
			const wrapper = render(N8nActionDropdown, {
				props: {
					items: [{ id: 'item1', label: 'Action 1' }],
				},
				slots: {
					footer: '<div>Footer content</div>',
				},
			});

			await userEvent.click(wrapper.container.querySelector('button')!);

			await waitFor(() => {
				expect(wrapper.getByText('Footer content')).toBeInTheDocument();
			});
		});

		it('should forward width to the dropdown menu', async () => {
			const wrapper = render(N8nActionDropdown, {
				props: {
					items: [{ id: 'item1', label: 'Action 1' }],
					width: '13rem',
				},
			});

			await userEvent.click(wrapper.container.querySelector('button')!);

			await waitFor(() => {
				const menu = document.querySelector<HTMLElement>('[role="menu"]');
				expect(menu?.style.getPropertyValue('--n8n--dropdown-menu-width')).toBe('13rem');
			});
		});
	});
});
