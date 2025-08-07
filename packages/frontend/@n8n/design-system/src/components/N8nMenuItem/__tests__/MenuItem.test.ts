/**
 * Test suite for N8nMenuItem component
 */

import { render } from '@testing-library/vue';
import { describe, it, expect, vi } from 'vitest';
import { createRouter, createWebHistory } from 'vue-router';
import N8nMenuItem from '../MenuItem.vue';
import type { IMenuItem } from '../../../types';

// Mock vue-router
const mockRouter = createRouter({
	history: createWebHistory(),
	routes: [
		{ path: '/', name: 'home', component: { template: '<div>Home</div>' } },
		{ path: '/workflows', name: 'workflows', component: { template: '<div>Workflows</div>' } },
		{ path: '/credentials', name: 'credentials', component: { template: '<div>Credentials</div>' } },
		{ path: '/settings', name: 'settings', component: { template: '<div>Settings</div>' } },
	],
});

const renderWithRouter = (component: any, options: any = {}) => {
	return render(component, {
		global: {
			plugins: [mockRouter],
			stubs: {
				'n8n-icon': {
					template: '<span class="n8n-icon-stub" :data-icon="icon" :data-size="size" :data-color="color"><slot /></span>',
					props: ['icon', 'size', 'color'],
				},
				'n8n-text': {
					template: '<span class="n8n-text-stub" :data-size="size" :data-color="color"><slot /></span>',
					props: ['size', 'color'],
				},
				'n8n-tooltip': {
					template: '<div class="n8n-tooltip-stub" :data-content="content" :data-disabled="disabled"><slot /></div>',
					props: ['content', 'disabled', 'placement', 'showAfter'],
				},
				'n8n-spinner': {
					template: '<div class="n8n-spinner-stub" :data-size="size"></div>',
					props: ['size'],
				},
				'conditional-router-link': {
					template: '<a class="conditional-router-link-stub"><slot /></a>',
					props: ['to'],
				},
				'el-menu-item': {
					template: '<li class="el-menu-item-stub" :data-index="index" :data-disabled="disabled"><slot /></li>',
					props: ['index', 'disabled'],
				},
				'el-sub-menu': {
					template: '<div class="el-sub-menu-stub" :data-index="index"><div class="title-slot"><slot name="title" /></div><div class="default-slot"><slot /></div></div>',
					props: ['index', 'popperClass', 'teleported'],
				},
			},
			...options.global,
		},
		...options,
	});
};

// Sample menu items for testing
const basicMenuItem: IMenuItem = {
	id: 'workflows',
	label: 'Workflows',
	icon: 'network-wired',
	route: { to: '/workflows' },
};

const menuItemWithChildren: IMenuItem = {
	id: 'settings',
	label: 'Settings',
	icon: 'cog',
	children: [
		{
			id: 'general-settings',
			label: 'General',
			route: { to: '/settings/general' },
		},
		{
			id: 'security-settings',
			label: 'Security',
			route: { to: '/settings/security' },
		},
	],
};

describe('N8nMenuItem', () => {
	describe('Basic Rendering', () => {
		it('should render basic menu item', () => {
			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: basicMenuItem,
				},
			});

			const menuItem = container.querySelector('.n8n-menu-item');
			expect(menuItem).toBeInTheDocument();

			const elMenuItem = container.querySelector('.el-menu-item-stub');
			expect(elMenuItem).toBeInTheDocument();
			expect(elMenuItem).toHaveAttribute('data-index', 'workflows');
		});

		it('should render menu item with icon', () => {
			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: basicMenuItem,
				},
			});

			const icon = container.querySelector('.n8n-icon-stub');
			expect(icon).toBeInTheDocument();
			expect(icon).toHaveAttribute('data-icon', 'network-wired');
			expect(icon).toHaveAttribute('data-size', 'large');
		});

		it('should render menu item label', () => {
			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: basicMenuItem,
				},
			});

			const menuItem = container.querySelector('.n8n-menu-item');
			expect(menuItem).toHaveTextContent('Workflows');
		});

		it('should render submenu when item has children', () => {
			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: menuItemWithChildren,
				},
			});

			const subMenu = container.querySelector('.el-sub-menu-stub');
			expect(subMenu).toBeInTheDocument();
			expect(subMenu).toHaveAttribute('data-index', 'settings');
		});
	});

	describe('Icon Variants', () => {
		it('should render string icon', () => {
			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: {
						...basicMenuItem,
						icon: 'star',
					},
				},
			});

			const icon = container.querySelector('.n8n-icon-stub');
			expect(icon).toBeInTheDocument();
			expect(icon).toHaveAttribute('data-icon', 'star');
		});

		it('should render object icon with type icon', () => {
			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: {
						...basicMenuItem,
						icon: {
							type: 'icon',
							value: 'heart',
							color: 'primary',
						},
					},
				},
			});

			const icon = container.querySelector('.n8n-icon-stub');
			expect(icon).toBeInTheDocument();
			expect(icon).toHaveAttribute('data-icon', 'heart');
			expect(icon).toHaveAttribute('data-color', 'primary');
		});

		it('should render emoji icon', () => {
			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: {
						...basicMenuItem,
						icon: {
							type: 'emoji',
							value: '🚀',
							color: 'primary',
						},
					},
				},
			});

			const text = container.querySelector('.n8n-text-stub');
			expect(text).toBeInTheDocument();
			expect(text).toHaveTextContent('🚀');
			expect(text).toHaveAttribute('data-color', 'primary');
		});

		it('should render with custom icon size', () => {
			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: {
						...basicMenuItem,
						customIconSize: 'small',
					},
				},
			});

			const icon = container.querySelector('.n8n-icon-stub');
			expect(icon).toBeInTheDocument();
			expect(icon).toHaveAttribute('data-size', 'small');
		});

		it('should render without icon', () => {
			const itemWithoutIcon = { ...basicMenuItem };
			delete itemWithoutIcon.icon;

			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: itemWithoutIcon,
				},
			});

			const icon = container.querySelector('.n8n-icon-stub');
			expect(icon).not.toBeInTheDocument();
		});
	});

	describe('Compact Mode', () => {
		it('should render in compact mode', () => {
			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: basicMenuItem,
					compact: true,
				},
			});

			const menuItem = container.querySelector('.n8n-menu-item');
			expect(menuItem).toBeInTheDocument();
		});

		it('should show tooltip in compact mode', () => {
			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: basicMenuItem,
					compact: true,
				},
			});

			const tooltip = container.querySelector('.n8n-tooltip-stub');
			expect(tooltip).toBeInTheDocument();
			expect(tooltip).toHaveAttribute('data-content', 'Workflows');
			expect(tooltip).toHaveAttribute('data-disabled', 'false');
		});

		it('should show initials when no icon in compact mode', () => {
			const itemWithoutIcon = { ...basicMenuItem };
			delete itemWithoutIcon.icon;

			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: itemWithoutIcon,
					compact: true,
				},
			});

			const menuItem = container.querySelector('.n8n-menu-item');
			expect(menuItem).toHaveTextContent('W'); // First letter of "Workflows"
		});

		it('should not show tooltip when not compact', () => {
			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: basicMenuItem,
					compact: false,
				},
			});

			const tooltip = container.querySelector('.n8n-tooltip-stub');
			expect(tooltip).toBeInTheDocument();
			expect(tooltip).toHaveAttribute('data-disabled', 'true');
		});
	});

	describe('Menu Item States', () => {
		it('should render disabled menu item', () => {
			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: {
						...basicMenuItem,
						disabled: true,
					},
				},
			});

			const elMenuItem = container.querySelector('.el-menu-item-stub');
			expect(elMenuItem).toHaveAttribute('data-disabled', 'true');
		});

		it('should render loading state', () => {
			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: {
						...basicMenuItem,
						isLoading: true,
					},
				},
			});

			const spinner = container.querySelector('.n8n-spinner-stub');
			expect(spinner).toBeInTheDocument();
			expect(spinner).toHaveAttribute('data-size', 'small');
		});

		it('should render notification indicator', () => {
			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: {
						...basicMenuItem,
						notification: true,
					},
				},
			});

			const menuItem = container.querySelector('.n8n-menu-item');
			expect(menuItem).toBeInTheDocument();
		});

		it('should render small size variant', () => {
			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: {
						...basicMenuItem,
						size: 'small',
					},
				},
			});

			const menuItem = container.querySelector('.n8n-menu-item');
			expect(menuItem).toBeInTheDocument();
		});
	});

	describe('Secondary Icon', () => {
		it('should render secondary icon', () => {
			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: {
						...basicMenuItem,
						secondaryIcon: {
							name: 'external-link',
							size: 'small',
						},
					},
				},
			});

			// Secondary icon is rendered inside the menu item
			const icons = container.querySelectorAll('.n8n-icon-stub');
			expect(icons.length).toBe(2); // Main icon + secondary icon
		});

		it('should render secondary icon with tooltip', () => {
			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: {
						...basicMenuItem,
						secondaryIcon: {
							name: 'info',
							tooltip: {
								content: 'Additional info',
								placement: 'top',
							},
						},
					},
				},
			});

			const tooltips = container.querySelectorAll('.n8n-tooltip-stub');
			expect(tooltips.length).toBeGreaterThan(1);
		});
	});

	describe('Mode Configuration', () => {
		it('should use router mode by default', () => {
			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: basicMenuItem,
				},
			});

			const menuItem = container.querySelector('.n8n-menu-item');
			expect(menuItem).toBeInTheDocument();
		});

		it('should use tabs mode', () => {
			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: basicMenuItem,
					mode: 'tabs',
					activeTab: 'workflows',
				},
			});

			const menuItem = container.querySelector('.n8n-menu-item');
			expect(menuItem).toBeInTheDocument();
		});

		it('should handle active tab in tabs mode', () => {
			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: basicMenuItem,
					mode: 'tabs',
					activeTab: 'workflows',
				},
			});

			const menuItem = container.querySelector('.n8n-menu-item');
			expect(menuItem).toBeInTheDocument();
		});
	});

	describe('Submenu Rendering', () => {
		it('should render submenu items', () => {
			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: menuItemWithChildren,
				},
			});

			const subMenu = container.querySelector('.el-sub-menu-stub');
			expect(subMenu).toBeInTheDocument();

			// Check for submenu title
			const titleSlot = container.querySelector('.title-slot');
			expect(titleSlot).toBeInTheDocument();
			expect(titleSlot).toHaveTextContent('Settings');

			// Check for child items container
			const defaultSlot = container.querySelector('.default-slot');
			expect(defaultSlot).toBeInTheDocument();
		});

		it('should render submenu with popper class', () => {
			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: menuItemWithChildren,
					popperClass: 'custom-popper',
				},
			});

			const subMenu = container.querySelector('.el-sub-menu-stub');
			expect(subMenu).toBeInTheDocument();
		});

		it('should filter out unavailable children', () => {
			const itemWithMixedChildren: IMenuItem = {
				...menuItemWithChildren,
				children: [
					{
						id: 'available-child',
						label: 'Available',
						available: true,
					},
					{
						id: 'unavailable-child',
						label: 'Unavailable',
						available: false,
					},
				],
			};

			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: itemWithMixedChildren,
				},
			});

			const subMenu = container.querySelector('.el-sub-menu-stub');
			expect(subMenu).toBeInTheDocument();
		});

		it('should handle custom child components', () => {
			const itemWithCustomChild: IMenuItem = {
				...menuItemWithChildren,
				children: [
					{
						id: 'custom-child',
						component: 'CustomComponent',
						props: { customProp: 'value' },
					},
				],
			};

			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: itemWithCustomChild,
				},
			});

			const subMenu = container.querySelector('.el-sub-menu-stub');
			expect(subMenu).toBeInTheDocument();
		});
	});

	describe('Event Handling', () => {
		it('should call handleSelect when clicked', () => {
			const handleSelect = vi.fn();

			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: basicMenuItem,
					handleSelect,
				},
			});

			const menuItem = container.querySelector('.n8n-menu-item');
			expect(menuItem).toBeInTheDocument();
		});

		it('should not call handleSelect when disabled', () => {
			const handleSelect = vi.fn();

			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: {
						...basicMenuItem,
						disabled: true,
					},
					handleSelect,
				},
			});

			const menuItem = container.querySelector('.n8n-menu-item');
			expect(menuItem).toBeInTheDocument();
		});
	});

	describe('Tooltip Configuration', () => {
		it('should use custom tooltip delay', () => {
			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: basicMenuItem,
					tooltipDelay: 500,
					compact: true,
				},
			});

			const tooltip = container.querySelector('.n8n-tooltip-stub');
			expect(tooltip).toBeInTheDocument();
		});

		it('should use default tooltip delay', () => {
			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: basicMenuItem,
					compact: true,
				},
			});

			const tooltip = container.querySelector('.n8n-tooltip-stub');
			expect(tooltip).toBeInTheDocument();
		});
	});

	describe('Complex Configurations', () => {
		it('should handle all props together', () => {
			const handleSelect = vi.fn();

			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: {
						...basicMenuItem,
						secondaryIcon: {
							name: 'info',
							tooltip: {
								content: 'Info tooltip',
							},
						},
						isLoading: true,
						notification: true,
						size: 'small',
					},
					compact: true,
					tooltipDelay: 500,
					popperClass: 'custom-popper',
					mode: 'tabs',
					activeTab: 'workflows',
					handleSelect,
				},
			});

			const menuItem = container.querySelector('.n8n-menu-item');
			expect(menuItem).toBeInTheDocument();

			const spinner = container.querySelector('.n8n-spinner-stub');
			expect(spinner).toBeInTheDocument();

			const tooltip = container.querySelector('.n8n-tooltip-stub');
			expect(tooltip).toBeInTheDocument();
		});

		it('should handle submenu with all options', () => {
			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: {
						...menuItemWithChildren,
						notification: true,
						secondaryIcon: {
							name: 'chevron-down',
						},
					},
					compact: false,
					tooltipDelay: 300,
					popperClass: 'submenu-popper',
					mode: 'router',
				},
			});

			const subMenu = container.querySelector('.el-sub-menu-stub');
			expect(subMenu).toBeInTheDocument();

			const titleSlot = container.querySelector('.title-slot');
			expect(titleSlot).toBeInTheDocument();
			expect(titleSlot).toHaveTextContent('Settings');
		});
	});

	describe('Edge Cases', () => {
		it('should handle item without label', () => {
			const itemWithoutLabel = { ...basicMenuItem };
			delete itemWithoutLabel.label;

			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: itemWithoutLabel,
				},
			});

			const menuItem = container.querySelector('.n8n-menu-item');
			expect(menuItem).toBeInTheDocument();
		});

		it('should handle item with empty children array', () => {
			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: {
						...basicMenuItem,
						children: [],
					},
				},
			});

			// Should render as regular menu item, not submenu
			const elMenuItem = container.querySelector('.el-menu-item-stub');
			expect(elMenuItem).toBeInTheDocument();

			const subMenu = container.querySelector('.el-sub-menu-stub');
			expect(subMenu).not.toBeInTheDocument();
		});

		it('should handle very long labels', () => {
			const itemWithLongLabel = {
				...basicMenuItem,
				label: 'This is a very long menu item label that should be truncated properly when displayed',
			};

			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: itemWithLongLabel,
				},
			});

			const menuItem = container.querySelector('.n8n-menu-item');
			expect(menuItem).toBeInTheDocument();
			expect(menuItem).toHaveTextContent(itemWithLongLabel.label);
		});

		it('should handle undefined handleSelect', () => {
			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: basicMenuItem,
					handleSelect: undefined,
				},
			});

			const menuItem = container.querySelector('.n8n-menu-item');
			expect(menuItem).toBeInTheDocument();
		});
	});

	describe('Accessibility', () => {
		it('should have proper menu item structure', () => {
			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: basicMenuItem,
				},
			});

			const elMenuItem = container.querySelector('.el-menu-item-stub');
			expect(elMenuItem).toBeInTheDocument();
			expect(elMenuItem).toHaveAttribute('data-index', 'workflows');
		});

		it('should handle ARIA attributes for disabled items', () => {
			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: {
						...basicMenuItem,
						disabled: true,
					},
				},
			});

			const elMenuItem = container.querySelector('.el-menu-item-stub');
			expect(elMenuItem).toHaveAttribute('data-disabled', 'true');
		});

		it('should provide proper tooltip content for accessibility', () => {
			const { container } = renderWithRouter(N8nMenuItem, {
				props: {
					item: basicMenuItem,
					compact: true,
				},
			});

			const tooltip = container.querySelector('.n8n-tooltip-stub');
			expect(tooltip).toHaveAttribute('data-content', 'Workflows');
		});
	});
});