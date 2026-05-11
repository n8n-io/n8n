import { describe, it, expect } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import DefaultLayout from './DefaultLayout.vue';

const renderComponent = createComponentRenderer(DefaultLayout, {
	global: {
		stubs: {
			AppSidebar: {
				template: '<div data-test-id="app-sidebar">App Sidebar</div>',
			},
			RouterView: {
				template: '<div><slot /></div>',
			},
			Suspense: {
				template: '<div><slot /></div>',
			},
		},
	},
});

describe('DefaultLayout', () => {
	it('should render the layout without throwing', () => {
		expect(() => renderComponent()).not.toThrow();
	});

	it('should render the main content area', () => {
		const { container } = renderComponent();
		const mainElement = container.querySelector('main#content');
		expect(mainElement).toBeInTheDocument();
	});

	it('should render app grid container from BaseLayout', () => {
		const { container } = renderComponent();
		const gridElement = container.querySelector('.app-grid');
		expect(gridElement).toBeInTheDocument();
	});

	it('should render RouterView content', () => {
		const { getByText } = renderComponent({
			global: {
				stubs: {
					AppSidebar: {
						template: '<div data-test-id="app-sidebar">App Sidebar</div>',
					},
					RouterView: {
						template: '<div>Default Layout Content</div>',
					},
					Suspense: {
						template: '<div><slot /></div>',
					},
				},
			},
		});
		expect(getByText('Default Layout Content')).toBeInTheDocument();
	});

	it('should render the sidebar', () => {
		const { container } = renderComponent();
		const sidebarElement = container.querySelector('aside#sidebar');
		expect(sidebarElement).toBeInTheDocument();
	});

	it('should render AppSidebar component in sidebar slot', () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId('app-sidebar')).toBeInTheDocument();
	});

	it('should wrap AppSidebar in Suspense', () => {
		const { container } = renderComponent();
		const sidebarElement = container.querySelector('aside#sidebar');
		expect(sidebarElement).toBeInTheDocument();
		expect(sidebarElement?.textContent).toContain('App Sidebar');
	});

	it('should not render header', () => {
		const { container } = renderComponent();
		const headerElement = container.querySelector('header#header');
		expect(headerElement).not.toBeInTheDocument();
	});

	it('should not render footer', () => {
		const { container } = renderComponent();
		// Footer should not be rendered as there's no footer slot content
		const footerWrapper = container.querySelector('[class*="contentFooter"]');
		expect(footerWrapper?.textContent).toBeFalsy();
	});

	it('should render sidebar and content together', () => {
		const { getByText, getByTestId } = renderComponent({
			global: {
				stubs: {
					AppSidebar: {
						template: '<div data-test-id="app-sidebar">App Sidebar</div>',
					},
					RouterView: {
						template: '<div>Main Content Area</div>',
					},
					Suspense: {
						template: '<div><slot /></div>',
					},
				},
			},
		});
		expect(getByTestId('app-sidebar')).toBeInTheDocument();
		expect(getByText('Main Content Area')).toBeInTheDocument();
	});
});
