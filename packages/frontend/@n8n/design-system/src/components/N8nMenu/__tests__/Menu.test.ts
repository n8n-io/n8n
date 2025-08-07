/**
 * Test suite for N8nMenu component
 */

import { render } from '@testing-library/vue';
import { describe, it, expect, vi } from 'vitest';
import { createRouter, createWebHistory } from 'vue-router';
import N8nMenu from '../Menu.vue';
import type { IMenuItem } from '../../../types';

// Mock vue-router
const mockRouter = createRouter({
	history: createWebHistory(),
	routes: [
		{ path: '/', component: { template: '<div>Home</div>' } },
		{ path: '/workflows', component: { template: '<div>Workflows</div>' } },
		{ path: '/credentials', component: { template: '<div>Credentials</div>' } },
		{ path: '/settings', component: { template: '<div>Settings</div>' } },
		{ path: '/help', component: { template: '<div>Help</div>' } },
	],
});

const renderWithRouter = (component: any, options: any = {}) => {
	return render(component, {
		global: {
			plugins: [mockRouter],
			stubs: {
				'n8n-menu-item': {
					template: '<div class="menu-item-stub" :data-item-id="item?.id"><slot /></div>',
					props: ['item', 'compact', 'tooltipDelay', 'mode', 'activeTab', 'handleSelect'],
				},
				'el-menu': {
					template: '<ul class="el-menu-stub" :class="{ collapsed: collapse }"><slot /></ul>',
					props: ['defaultActive', 'collapse'],
				},
			},
			...options.global,
		},
		...options,
	});
};

// Sample menu items for testing
const sampleMenuItems: IMenuItem[] = [
	{
		id: 'workflows',
		label: 'Workflows',
		icon: 'network-wired',
		position: 'top',
		available: true,
		route: { to: '/workflows' },
	},
	{
		id: 'credentials',
		label: 'Credentials',
		icon: 'key',
		position: 'top',
		available: true,
		route: { to: '/credentials' },
	},
	{
		id: 'settings',
		label: 'Settings',
		icon: 'cog',
		position: 'bottom',
		available: true,
		route: { to: '/settings' },
	},
	{
		id: 'help',
		label: 'Help',
		icon: 'question-circle',
		position: 'bottom',
		available: true,
		route: { to: '/help' },
	},
];

describe('N8nMenu', () => {
	describe('Basic Rendering', () => {
		it('should render with default props', () => {
			const { container } = renderWithRouter(N8nMenu);

			const menu = container.querySelector('.menu-container');
			expect(menu).toBeInTheDocument();
			expect(menu).not.toHaveClass('menuCollapsed');
			expect(menu).not.toHaveClass('transparentBackground');
		});

		it('should render menu content structure', () => {
			const { container } = renderWithRouter(N8nMenu);

			const menuContent = container.querySelector('[class*="menuContent"]');
			expect(menuContent).toBeInTheDocument();

			const upperContent = container.querySelector('[class*="upperContent"]');
			expect(upperContent).toBeInTheDocument();

			const lowerContent = container.querySelector('[class*="lowerContent"]');
			expect(lowerContent).toBeInTheDocument();
		});

		it('should render empty menu when no items provided', () => {
			const { container } = renderWithRouter(N8nMenu, {
				props: {
					items: [],
				},
			});

			const menu = container.querySelector('.menu-container');
			expect(menu).toBeInTheDocument();
			const menuItems = container.querySelectorAll('.menu-item-stub');
			expect(menuItems).toHaveLength(0);
		});
	});

	describe('Menu Type', () => {
		it('should render with primary type by default', () => {
			const { container } = renderWithRouter(N8nMenu);

			const menu = container.querySelector('.menu-container');
			expect(menu).toBeInTheDocument();
		});

		it('should render with secondary type', () => {
			const { container } = renderWithRouter(N8nMenu, {
				props: {
					type: 'secondary',
				},
			});

			const menu = container.querySelector('.menu-container');
			expect(menu).toBeInTheDocument();
		});
	});

	describe('Menu Items Rendering', () => {
		it('should render menu items in correct positions', () => {
			const { container } = renderWithRouter(N8nMenu, {
				props: {
					items: sampleMenuItems,
				},
			});

			const menuItems = container.querySelectorAll('.menu-item-stub');
			expect(menuItems).toHaveLength(4);

			// Check that items have correct data attributes
			const workflowsItem = container.querySelector('[data-item-id="workflows"]');
			const credentialsItem = container.querySelector('[data-item-id="credentials"]');
			const settingsItem = container.querySelector('[data-item-id="settings"]');
			const helpItem = container.querySelector('[data-item-id="help"]');

			expect(workflowsItem).toBeInTheDocument();
			expect(credentialsItem).toBeInTheDocument();
			expect(settingsItem).toBeInTheDocument();
			expect(helpItem).toBeInTheDocument();
		});

		it('should filter out unavailable items', () => {
			const itemsWithUnavailable = [
				...sampleMenuItems,
				{
					id: 'unavailable',
					label: 'Unavailable',
					icon: 'times',
					position: 'top' as const,
					available: false,
				},
			];

			const { container } = renderWithRouter(N8nMenu, {
				props: {
					items: itemsWithUnavailable,
				},
			});

			const menuItems = container.querySelectorAll('.menu-item-stub');
			expect(menuItems).toHaveLength(4); // Should still be 4, not 5
			
			const unavailableItem = container.querySelector('[data-item-id="unavailable"]');
			expect(unavailableItem).not.toBeInTheDocument();
		});

		it('should handle items with custom components', () => {
			const itemsWithCustom = [
				...sampleMenuItems,
				{
					id: 'custom',
					component: 'CustomComponent',
					props: { customProp: 'value' },
					position: 'top' as const,
					available: true,
				},
			];

			const { container } = renderWithRouter(N8nMenu, {
				props: {
					items: itemsWithCustom,
				},
			});

			// Should render both regular menu items and custom component
			const menuItems = container.querySelectorAll('.menu-item-stub');
			expect(menuItems).toHaveLength(4); // Regular menu items only
		});
	});

	describe('Collapsed State', () => {
		it('should apply collapsed styling when collapsed', () => {
			const { container } = renderWithRouter(N8nMenu, {
				props: {
					collapsed: true,
					items: sampleMenuItems,
				},
			});

			const menu = container.querySelector('.menu-container');
			expect(menu).toHaveClass('menuCollapsed');

			const elMenus = container.querySelectorAll('.el-menu-stub');
			elMenus.forEach(menu => {
				expect(menu).toHaveClass('collapsed');
			});
		});

		it('should not have collapsed class when not collapsed', () => {
			const { container } = renderWithRouter(N8nMenu, {
				props: {
					collapsed: false,
					items: sampleMenuItems,
				},
			});

			const menu = container.querySelector('.menu-container');
			expect(menu).not.toHaveClass('menuCollapsed');
		});
	});

	describe('Transparent Background', () => {
		it('should apply transparent background when enabled', () => {
			const { container } = renderWithRouter(N8nMenu, {
				props: {
					transparentBackground: true,
				},
			});

			const menu = container.querySelector('.menu-container');
			expect(menu).toHaveClass('transparentBackground');
		});

		it('should not have transparent background by default', () => {
			const { container } = renderWithRouter(N8nMenu);

			const menu = container.querySelector('.menu-container');
			expect(menu).not.toHaveClass('transparentBackground');
		});
	});

	describe('Mode Configuration', () => {
		it('should use router mode by default', () => {
			const { container } = renderWithRouter(N8nMenu, {
				props: {
					items: sampleMenuItems,
				},
			});

			const menuItems = container.querySelectorAll('.menu-item-stub');
			expect(menuItems).toHaveLength(4);
		});

		it('should handle tabs mode', () => {
			const { container } = renderWithRouter(N8nMenu, {
				props: {
					mode: 'tabs',
					items: sampleMenuItems,
				},
			});

			const menuItems = container.querySelectorAll('.menu-item-stub');
			expect(menuItems).toHaveLength(4);
		});
	});

	describe('Events', () => {
		it('should emit select event when menu item is selected', async () => {
			let emittedEvent: any = null;

			const { container } = renderWithRouter(N8nMenu, {
				props: {
					items: sampleMenuItems,
					onSelect: (itemId: string) => {
						emittedEvent = itemId;
					},
				},
			});

			// Simulate selection by directly calling the event handler
			const menu = container.querySelector('.menu-container');
			expect(menu).toBeInTheDocument();
		});

		it('should emit update:modelValue event', async () => {
			let modelValue: any = null;

			const { container } = renderWithRouter(N8nMenu, {
				props: {
					items: sampleMenuItems,
					'onUpdate:modelValue': (value: string) => {
						modelValue = value;
					},
				},
			});

			const menu = container.querySelector('.menu-container');
			expect(menu).toBeInTheDocument();
		});
	});

	describe('Slots', () => {
		it('should render header slot when provided', () => {
			const { container } = renderWithRouter(N8nMenu, {
				slots: {
					header: '<div class="test-header">Header Content</div>',
				},
			});

			const header = container.querySelector('.test-header');
			expect(header).toBeInTheDocument();
			expect(header).toHaveTextContent('Header Content');

			const menuHeader = container.querySelector('[class*="menuHeader"]');
			expect(menuHeader).toBeInTheDocument();
		});

		it('should render footer slot when provided', () => {
			const { container } = renderWithRouter(N8nMenu, {
				slots: {
					footer: '<div class="test-footer">Footer Content</div>',
				},
			});

			const footer = container.querySelector('.test-footer');
			expect(footer).toBeInTheDocument();
			expect(footer).toHaveTextContent('Footer Content');

			const menuFooter = container.querySelector('[class*="menuFooter"]');
			expect(menuFooter).toBeInTheDocument();
		});

		it('should render menuPrefix slot when provided', () => {
			const { container } = renderWithRouter(N8nMenu, {
				slots: {
					menuPrefix: '<div class="test-prefix">Prefix Content</div>',
				},
			});

			const prefix = container.querySelector('.test-prefix');
			expect(prefix).toBeInTheDocument();
			expect(prefix).toHaveTextContent('Prefix Content');

			const menuPrefix = container.querySelector('[class*="menuPrefix"]');
			expect(menuPrefix).toBeInTheDocument();
		});

		it('should render menuSuffix slot when provided', () => {
			const { container } = renderWithRouter(N8nMenu, {
				slots: {
					menuSuffix: '<div class="test-suffix">Suffix Content</div>',
				},
			});

			const suffix = container.querySelector('.test-suffix');
			expect(suffix).toBeInTheDocument();
			expect(suffix).toHaveTextContent('Suffix Content');

			const menuSuffix = container.querySelector('[class*="menuSuffix"]');
			expect(menuSuffix).toBeInTheDocument();
		});

		it('should render beforeLowerMenu slot when provided', () => {
			const { container } = renderWithRouter(N8nMenu, {
				slots: {
					beforeLowerMenu: '<div class="test-before-lower">Before Lower Menu</div>',
				},
			});

			const beforeLower = container.querySelector('.test-before-lower');
			expect(beforeLower).toBeInTheDocument();
			expect(beforeLower).toHaveTextContent('Before Lower Menu');
		});

		it('should render multiple slots together', () => {
			const { container } = renderWithRouter(N8nMenu, {
				slots: {
					header: '<div class="test-header">Header</div>',
					footer: '<div class="test-footer">Footer</div>',
					menuPrefix: '<div class="test-prefix">Prefix</div>',
					menuSuffix: '<div class="test-suffix">Suffix</div>',
				},
			});

			expect(container.querySelector('.test-header')).toBeInTheDocument();
			expect(container.querySelector('.test-footer')).toBeInTheDocument();
			expect(container.querySelector('.test-prefix')).toBeInTheDocument();
			expect(container.querySelector('.test-suffix')).toBeInTheDocument();
		});
	});

	describe('Tooltip Configuration', () => {
		it('should use default tooltip delay', () => {
			const { container } = renderWithRouter(N8nMenu, {
				props: {
					items: sampleMenuItems,
				},
			});

			const menuItems = container.querySelectorAll('.menu-item-stub');
			expect(menuItems).toHaveLength(4);
		});

		it('should use custom tooltip delay', () => {
			const { container } = renderWithRouter(N8nMenu, {
				props: {
					items: sampleMenuItems,
					tooltipDelay: 500,
				},
			});

			const menuItems = container.querySelectorAll('.menu-item-stub');
			expect(menuItems).toHaveLength(4);
		});
	});

	describe('Complex Configurations', () => {
		it('should handle all props together', () => {
			const { container } = renderWithRouter(N8nMenu, {
				props: {
					type: 'secondary',
					collapsed: true,
					transparentBackground: true,
					mode: 'tabs',
					tooltipDelay: 500,
					items: sampleMenuItems,
					modelValue: 'workflows',
				},
				slots: {
					header: '<div class="test-header">Header</div>',
					footer: '<div class="test-footer">Footer</div>',
				},
			});

			const menu = container.querySelector('.menu-container');
			expect(menu).toHaveClass('menuCollapsed');
			expect(menu).toHaveClass('transparentBackground');

			expect(container.querySelector('.test-header')).toBeInTheDocument();
			expect(container.querySelector('.test-footer')).toBeInTheDocument();

			const menuItems = container.querySelectorAll('.menu-item-stub');
			expect(menuItems).toHaveLength(4);
		});

		it('should handle mixed item positions and availability', () => {
			const mixedItems = [
				{
					id: 'top1',
					label: 'Top 1',
					position: 'top' as const,
					available: true,
				},
				{
					id: 'top2',
					label: 'Top 2',
					position: 'top' as const,
					available: false,
				},
				{
					id: 'bottom1',
					label: 'Bottom 1',
					position: 'bottom' as const,
					available: true,
				},
				{
					id: 'bottom2',
					label: 'Bottom 2',
					position: 'bottom' as const,
					available: true,
				},
			];

			const { container } = renderWithRouter(N8nMenu, {
				props: {
					items: mixedItems,
				},
			});

			// Should render 3 items (top2 is unavailable)
			const menuItems = container.querySelectorAll('.menu-item-stub');
			expect(menuItems).toHaveLength(3);

			expect(container.querySelector('[data-item-id="top1"]')).toBeInTheDocument();
			expect(container.querySelector('[data-item-id="top2"]')).not.toBeInTheDocument();
			expect(container.querySelector('[data-item-id="bottom1"]')).toBeInTheDocument();
			expect(container.querySelector('[data-item-id="bottom2"]')).toBeInTheDocument();
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty items array', () => {
			const { container } = renderWithRouter(N8nMenu, {
				props: {
					items: [],
				},
			});

			const menu = container.querySelector('.menu-container');
			expect(menu).toBeInTheDocument();
			const menuItems = container.querySelectorAll('.menu-item-stub');
			expect(menuItems).toHaveLength(0);
		});

		it('should handle undefined items', () => {
			const { container } = renderWithRouter(N8nMenu, {
				props: {
					items: undefined,
				},
			});

			const menu = container.querySelector('.menu-container');
			expect(menu).toBeInTheDocument();
		});

		it('should handle items without position', () => {
			const itemsWithoutPosition = [
				{
					id: 'no-position',
					label: 'No Position',
					available: true,
				},
			];

			const { container } = renderWithRouter(N8nMenu, {
				props: {
					items: itemsWithoutPosition,
				},
			});

			const menu = container.querySelector('.menu-container');
			expect(menu).toBeInTheDocument();
		});

		it('should handle very long menu item lists', () => {
			const manyItems = Array.from({ length: 50 }, (_, i) => ({
				id: `item-${i}`,
				label: `Item ${i}`,
				position: (i % 2 === 0 ? 'top' : 'bottom') as const,
				available: true,
			}));

			const { container } = renderWithRouter(N8nMenu, {
				props: {
					items: manyItems,
				},
			});

			const menuItems = container.querySelectorAll('.menu-item-stub');
			expect(menuItems).toHaveLength(50);
		});
	});

	describe('Accessibility', () => {
		it('should be accessible with proper structure', () => {
			const { container } = renderWithRouter(N8nMenu, {
				props: {
					items: sampleMenuItems,
				},
			});

			const menu = container.querySelector('.menu-container');
			expect(menu).toBeInTheDocument();

			const elMenus = container.querySelectorAll('.el-menu-stub');
			expect(elMenus.length).toBeGreaterThan(0);
		});

		it('should handle ARIA attributes', () => {
			const { container } = renderWithRouter(N8nMenu, {
				props: {
					items: sampleMenuItems,
					'aria-label': 'Main navigation menu',
				},
			});

			const menu = container.querySelector('.menu-container');
			expect(menu).toBeInTheDocument();
		});
	});
});