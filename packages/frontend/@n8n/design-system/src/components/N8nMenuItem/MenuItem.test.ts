import userEvent from '@testing-library/user-event';
import { configure, render } from '@testing-library/vue';

import type { IMenuItem } from '@n8n/design-system/types';

import N8nMenuItem from './MenuItem.vue';

configure({ testIdAttribute: 'data-test-id' });

const stubs = {
	RouterLink: true,
	N8nTooltip: {
		template: '<div><slot /></div>',
	},
};

const createMenuItem = (overrides: Partial<IMenuItem> = {}): IMenuItem => ({
	id: 'test-item',
	label: 'Test Item',
	...overrides,
});

describe('N8nMenuItem', () => {
	describe('rendering', () => {
		it('should render correctly with basic props', () => {
			const { getByTestId, getByText } = render(N8nMenuItem, {
				props: {
					item: createMenuItem(),
				},
				global: { stubs },
			});
			expect(getByTestId('test-item')).toBeTruthy();
			expect(getByTestId('menu-item')).toBeTruthy();
			expect(getByText('Test Item')).toBeVisible();
		});

		it('should render the label', () => {
			const { getByText } = render(N8nMenuItem, {
				props: {
					item: createMenuItem({ label: 'My Label' }),
				},
				global: { stubs },
			});
			expect(getByText('My Label')).toBeVisible();
		});

		it('should set the correct data-test-id from item id', () => {
			const { getByTestId } = render(N8nMenuItem, {
				props: {
					item: createMenuItem({ id: 'custom-id' }),
				},
				global: { stubs },
			});
			expect(getByTestId('custom-id')).toBeTruthy();
		});
	});

	describe('icon prop', () => {
		it('should render string icon', () => {
			const { html } = render(N8nMenuItem, {
				props: {
					item: createMenuItem({ icon: 'house' }),
				},
				global: { stubs: { ...stubs, N8nIcon: true } },
			});
			expect(html()).toContain('icon="house"');
		});

		it('should render icon object with type icon', () => {
			const { html } = render(N8nMenuItem, {
				props: {
					item: createMenuItem({
						icon: { type: 'icon', value: 'house', color: 'primary' },
					}),
				},
				global: { stubs: { ...stubs, N8nIcon: true } },
			});
			expect(html()).toContain('icon="house"');
			expect(html()).toContain('color="primary"');
		});

		it('should render emoji icon', () => {
			const { getByText } = render(N8nMenuItem, {
				props: {
					item: createMenuItem({
						icon: { type: 'emoji', value: '🏠' },
					}),
				},
				global: { stubs },
			});
			expect(getByText('🏠')).toBeVisible();
		});
	});

	describe('active prop', () => {
		it('should apply active class when active is true', () => {
			const { getByTestId } = render(N8nMenuItem, {
				props: {
					item: createMenuItem(),
					active: true,
				},
				global: { stubs },
			});
			const menuItem = getByTestId('menu-item');
			expect(menuItem.className).toContain('active');
		});

		it('should not apply active class when active is false', () => {
			const { getByTestId } = render(N8nMenuItem, {
				props: {
					item: createMenuItem(),
					active: false,
				},
				global: { stubs },
			});
			const menuItem = getByTestId('menu-item');
			expect(menuItem.className).not.toContain('active');
		});
	});

	describe('compact prop', () => {
		it('should apply compact class when compact is true', () => {
			const { getByTestId } = render(N8nMenuItem, {
				props: {
					item: createMenuItem(),
					compact: true,
				},
				global: { stubs },
			});
			const menuItem = getByTestId('menu-item');
			expect(menuItem.className).toContain('compact');
		});

		it('should not render label in menu item when compact is true', () => {
			const { getByTestId } = render(N8nMenuItem, {
				props: {
					item: createMenuItem({ label: 'Hidden Label' }),
					compact: true,
				},
				global: { stubs },
			});
			// In compact mode, the label should not be in the menu item itself (only in the tooltip)
			const menuItem = getByTestId('menu-item');
			expect(menuItem.textContent).not.toContain('Hidden Label');
		});

		it('should not render BetaTag when compact is true', () => {
			const { html } = render(N8nMenuItem, {
				props: {
					item: createMenuItem({ beta: true }),
					compact: true,
				},
				global: { stubs: { ...stubs, BetaTag: true } },
			});
			expect(html()).not.toContain('beta-tag');
		});
	});

	describe('disabled prop', () => {
		it('should apply disabled class when item is disabled', () => {
			const { getByTestId } = render(N8nMenuItem, {
				props: {
					item: createMenuItem({ disabled: true }),
				},
				global: { stubs },
			});
			const menuItem = getByTestId('menu-item');
			expect(menuItem.className).toContain('disabled');
		});

		it('should set aria-disabled when item is disabled', () => {
			const { getByTestId } = render(N8nMenuItem, {
				props: {
					item: createMenuItem({ disabled: true }),
				},
				global: { stubs },
			});
			const menuItem = getByTestId('menu-item');
			expect(menuItem).toHaveAttribute('aria-disabled', 'true');
		});

		it('should not emit click event when disabled', async () => {
			const { getByTestId, emitted } = render(N8nMenuItem, {
				props: {
					item: createMenuItem({ disabled: true }),
				},
				global: { stubs },
			});
			await userEvent.click(getByTestId('menu-item'));
			expect(emitted('click')).toBeUndefined();
		});

		it('should not have href when disabled with route', () => {
			const { getByTestId } = render(N8nMenuItem, {
				props: {
					item: createMenuItem({
						disabled: true,
						route: { to: { name: 'workflows' } },
					}),
				},
				global: { stubs },
			});
			const menuItem = getByTestId('menu-item');
			// When disabled, the `to` prop should be undefined (no navigation href)
			expect(menuItem).not.toHaveAttribute('href');
		});
	});

	describe('beta prop', () => {
		it('should render BetaTag when beta is true', () => {
			const { html } = render(N8nMenuItem, {
				props: {
					item: createMenuItem({ beta: true }),
				},
				global: { stubs: { ...stubs, BetaTag: true } },
			});
			expect(html()).toContain('beta-tag-stub');
		});

		it('should not render BetaTag when beta is false', () => {
			const { html } = render(N8nMenuItem, {
				props: {
					item: createMenuItem({ beta: false }),
				},
				global: { stubs: { ...stubs, BetaTag: true } },
			});
			expect(html()).not.toContain('beta-tag-stub');
		});
	});

	describe('children prop', () => {
		it('should render chevron icon when item has children', () => {
			const { html } = render(N8nMenuItem, {
				props: {
					item: createMenuItem({
						children: [{ id: 'child', label: 'Child Item' }],
					}),
				},
				global: { stubs: { ...stubs, N8nIcon: true } },
			});
			expect(html()).toContain('icon="chevron-right"');
		});

		it('should not render chevron icon when compact', () => {
			const { html } = render(N8nMenuItem, {
				props: {
					item: createMenuItem({
						children: [{ id: 'child', label: 'Child Item' }],
					}),
					compact: true,
				},
				global: { stubs: { ...stubs, N8nIcon: true } },
			});
			// When compact, the chevron should not be rendered
			expect(html()).not.toContain('chevron-right');
		});
	});

	describe('notification prop', () => {
		it('should render notification indicator when notification is true', () => {
			const { container } = render(N8nMenuItem, {
				props: {
					item: createMenuItem({
						icon: 'bell',
						notification: true,
					}),
				},
				global: { stubs: { ...stubs, N8nIcon: true } },
			});
			const iconWrapper = container.querySelector('[class*="notification"]');
			expect(iconWrapper).toBeTruthy();
		});
	});

	describe('route and link props', () => {
		it('should render with route', () => {
			const { getByTestId } = render(N8nMenuItem, {
				props: {
					item: createMenuItem({
						route: { to: { name: 'workflows' } },
					}),
				},
				global: { stubs },
			});
			const menuItem = getByTestId('menu-item');
			expect(menuItem).toBeTruthy();
			expect(menuItem).toHaveAttribute('role', 'menuitem');
		});

		it('should render with external link', () => {
			const { getByTestId } = render(N8nMenuItem, {
				props: {
					item: createMenuItem({
						link: { href: 'https://example.com', target: '_blank' },
					}),
				},
				global: { stubs },
			});
			const menuItem = getByTestId('menu-item');
			expect(menuItem).toBeTruthy();
			expect(menuItem).toHaveAttribute('role', 'menuitem');
		});
	});

	describe('aria-label', () => {
		it('should use ariaLabel prop when provided', () => {
			const { getByTestId } = render(N8nMenuItem, {
				props: {
					item: createMenuItem({ label: 'Item Label' }),
					ariaLabel: 'Custom Aria Label',
				},
				global: { stubs },
			});
			const menuItem = getByTestId('menu-item');
			expect(menuItem).toHaveAttribute('aria-label', 'Custom Aria Label');
		});

		it('should fall back to item label when ariaLabel not provided', () => {
			const { getByTestId } = render(N8nMenuItem, {
				props: {
					item: createMenuItem({ label: 'Item Label' }),
				},
				global: { stubs },
			});
			const menuItem = getByTestId('menu-item');
			expect(menuItem).toHaveAttribute('aria-label', 'Item Label');
		});
	});

	describe('click events', () => {
		it('should emit click event when clicked', async () => {
			const { getByTestId, emitted } = render(N8nMenuItem, {
				props: {
					item: createMenuItem(),
				},
				global: { stubs },
			});
			await userEvent.click(getByTestId('menu-item'));
			expect(emitted('click')).toHaveLength(1);
		});
	});
});
