import { describe, it, expect } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import AuthLayout from './AuthLayout.vue';

const renderComponent = createComponentRenderer(AuthLayout, {
	global: {
		stubs: {
			RouterView: {
				template: '<div><slot /></div>',
			},
		},
	},
});

describe('AuthLayout', () => {
	it('should render the layout without throwing', () => {
		expect(() => renderComponent()).not.toThrow();
	});

	it('should render the main content area', () => {
		const { container } = renderComponent();
		const mainElement = container.querySelector('main#content');
		expect(mainElement).toBeInTheDocument();
	});

	it('should render RouterView content', () => {
		const { getByText } = renderComponent({
			global: {
				stubs: {
					RouterView: {
						template: '<div>Blank Layout Content</div>',
					},
				},
			},
		});
		expect(getByText('Blank Layout Content')).toBeInTheDocument();
	});

	it('should render app grid container from BaseLayout', () => {
		const { container } = renderComponent();
		const gridElement = container.querySelector('.app-grid');
		expect(gridElement).toBeInTheDocument();
	});

	it('should not render header', () => {
		const { container } = renderComponent();
		const headerElement = container.querySelector('header#header');
		expect(headerElement).not.toBeInTheDocument();
	});

	it('should not render sidebar', () => {
		const { container } = renderComponent();
		const sidebarElement = container.querySelector('aside#sidebar');
		expect(sidebarElement).not.toBeInTheDocument();
	});

	it('should render multiple RouterView items', () => {
		const { getByText } = renderComponent({
			global: {
				stubs: {
					RouterView: {
						template: `
							<div>
								<div>First Item</div>
								<div>Second Item</div>
								<div>Third Item</div>
							</div>
						`,
					},
				},
			},
		});
		expect(getByText('First Item')).toBeInTheDocument();
		expect(getByText('Second Item')).toBeInTheDocument();
		expect(getByText('Third Item')).toBeInTheDocument();
	});
});
