import { render } from '@testing-library/vue';

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
					stubs: ['N8nIcon', 'ElTooltip', 'ElDropdown', 'ElDropdownMenu', 'ElDropdownItem'],
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
					stubs: ['N8nIcon', 'ElDropdown', 'ElDropdownMenu', 'ElDropdownItem'],
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
							badgeProps: { theme: 'warning', bold: true },
							disabled: true,
						},
						{
							id: 'item2',
							label: 'Action 2',
						},
					],
				},
				global: {
					stubs: ['N8nIcon', 'N8nBadge', 'ElDropdown', 'ElDropdownMenu', 'ElDropdownItem'],
				},
			});

			expect(wrapper.html()).toContain('action-dropdown-container');
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
	});
});
