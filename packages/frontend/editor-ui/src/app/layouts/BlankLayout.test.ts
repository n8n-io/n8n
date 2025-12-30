import { describe, it, expect } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import BlankLayout from './BlankLayout.vue';

const renderComponent = createComponentRenderer(BlankLayout);

describe('BlankLayout', () => {
	it('should render the layout without throwing', () => {
		expect(() => renderComponent()).not.toThrow();
	});

	it('should render the main content area', () => {
		const { container } = renderComponent();
		const mainElement = container.querySelector('main#content');
		expect(mainElement).toBeInTheDocument();
	});

	it('should render default slot content', () => {
		const { getByText } = renderComponent({
			slots: {
				default: '<div>Blank Layout Content</div>',
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
		const { container } = renderComponent({
			slots: {
				default: '<div>Content</div>',
			},
		});
		const headerElement = container.querySelector('header#header');
		expect(headerElement).not.toBeInTheDocument();
	});

	it('should not render sidebar', () => {
		const { container } = renderComponent({
			slots: {
				default: '<div>Content</div>',
			},
		});
		const sidebarElement = container.querySelector('aside#sidebar');
		expect(sidebarElement).not.toBeInTheDocument();
	});

	it('should render multiple slot items', () => {
		const { getByText } = renderComponent({
			slots: {
				default: `
					<div>First Item</div>
					<div>Second Item</div>
					<div>Third Item</div>
				`,
			},
		});
		expect(getByText('First Item')).toBeInTheDocument();
		expect(getByText('Second Item')).toBeInTheDocument();
		expect(getByText('Third Item')).toBeInTheDocument();
	});
});
