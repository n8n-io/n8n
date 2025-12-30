import { describe, it, expect } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import DemoLayout from './DemoLayout.vue';

const renderComponent = createComponentRenderer(DemoLayout, {
	global: {
		stubs: {
			DemoFooter: {
				template: '<div data-test-id="demo-footer">Demo Footer</div>',
			},
		},
	},
});

describe('DemoLayout', () => {
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

	it('should render default slot content', () => {
		const { getByText } = renderComponent({
			slots: {
				default: '<div>Demo Layout Content</div>',
			},
		});
		expect(getByText('Demo Layout Content')).toBeInTheDocument();
	});

	it('should render DemoFooter component in footer slot', () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId('demo-footer')).toBeInTheDocument();
	});

	it('should wrap DemoFooter in Suspense', () => {
		const { getByTestId } = renderComponent();
		const demoFooter = getByTestId('demo-footer');
		expect(demoFooter).toBeInTheDocument();
		expect(demoFooter.textContent).toBe('Demo Footer');
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

	it('should render content and footer together', () => {
		const { getByText, getByTestId } = renderComponent({
			slots: {
				default: '<div>Main Content Area</div>',
			},
		});
		expect(getByText('Main Content Area')).toBeInTheDocument();
		expect(getByTestId('demo-footer')).toBeInTheDocument();
	});

	it('should render multiple content items in default slot', () => {
		const { getByText, getByTestId } = renderComponent({
			slots: {
				default: `
					<div>First Content</div>
					<div>Second Content</div>
					<div>Third Content</div>
				`,
			},
		});
		expect(getByText('First Content')).toBeInTheDocument();
		expect(getByText('Second Content')).toBeInTheDocument();
		expect(getByText('Third Content')).toBeInTheDocument();
		expect(getByTestId('demo-footer')).toBeInTheDocument();
	});
});
