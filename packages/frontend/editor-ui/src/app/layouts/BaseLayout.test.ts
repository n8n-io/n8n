import { describe, it, expect } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import BaseLayout from './BaseLayout.vue';

const renderComponent = createComponentRenderer(BaseLayout);

describe('BaseLayout', () => {
	it('should render the layout without throwing', () => {
		expect(() => renderComponent()).not.toThrow();
	});

	it('should render the main content area', () => {
		const { container } = renderComponent();
		const mainElement = container.querySelector('main#content');
		expect(mainElement).toBeInTheDocument();
	});

	it('should render the app grid container', () => {
		const { container } = renderComponent();
		const gridElement = container.querySelector('.app-grid');
		expect(gridElement).toBeInTheDocument();
	});

	it('should render default slot content', () => {
		const { getByText } = renderComponent({
			slots: {
				default: '<div>Main Content</div>',
			},
		});
		expect(getByText('Main Content')).toBeInTheDocument();
	});

	it('should render header slot when provided', () => {
		const { getByText, container } = renderComponent({
			slots: {
				header: '<div>Header Content</div>',
			},
		});
		expect(getByText('Header Content')).toBeInTheDocument();
		const headerElement = container.querySelector('header#header');
		expect(headerElement).toBeInTheDocument();
	});

	it('should render sidebar slot when provided', () => {
		const { getByText, container } = renderComponent({
			slots: {
				sidebar: '<div>Sidebar Content</div>',
			},
		});
		expect(getByText('Sidebar Content')).toBeInTheDocument();
		const sidebarElement = container.querySelector('aside#sidebar');
		expect(sidebarElement).toBeInTheDocument();
	});

	it('should render footer slot when provided', () => {
		const { getByText } = renderComponent({
			slots: {
				footer: '<div>Footer Content</div>',
			},
		});
		expect(getByText('Footer Content')).toBeInTheDocument();
	});

	it('should not render header when slot is not provided', () => {
		const { container } = renderComponent();
		const headerElement = container.querySelector('header#header');
		expect(headerElement).not.toBeInTheDocument();
	});

	it('should not render sidebar when slot is not provided', () => {
		const { container } = renderComponent();
		const sidebarElement = container.querySelector('aside#sidebar');
		expect(sidebarElement).not.toBeInTheDocument();
	});

	it('should render all slots together', () => {
		const { getByText, container } = renderComponent({
			slots: {
				header: '<div>Header</div>',
				sidebar: '<div>Sidebar</div>',
				default: '<div>Content</div>',
				footer: '<div>Footer</div>',
			},
		});
		expect(getByText('Header')).toBeInTheDocument();
		expect(getByText('Sidebar')).toBeInTheDocument();
		expect(getByText('Content')).toBeInTheDocument();
		expect(getByText('Footer')).toBeInTheDocument();
		expect(container.querySelector('header#header')).toBeInTheDocument();
		expect(container.querySelector('aside#sidebar')).toBeInTheDocument();
		expect(container.querySelector('main#content')).toBeInTheDocument();
	});

	it('should have proper grid structure with CSS modules', () => {
		const { container } = renderComponent({
			slots: {
				header: '<div>Header</div>',
				sidebar: '<div>Sidebar</div>',
			},
		});
		const gridElement = container.querySelector('.app-grid');
		expect(gridElement).toHaveClass('app-grid');
	});
});
