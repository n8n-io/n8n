import { describe, it, expect } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import ChatLayout from './ChatLayout.vue';

const renderComponent = createComponentRenderer(ChatLayout, {
	global: {
		stubs: {
			ChatSidebar: {
				template: '<div data-test-id="chat-sidebar">Chat Sidebar</div>',
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

describe('ChatLayout', () => {
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
					ChatSidebar: {
						template: '<div data-test-id="chat-sidebar">Chat Sidebar</div>',
					},
					RouterView: {
						template: '<div>Chat Layout Content</div>',
					},
					Suspense: {
						template: '<div><slot /></div>',
					},
				},
			},
		});
		expect(getByText('Chat Layout Content')).toBeInTheDocument();
	});

	it('should render the sidebar', () => {
		const { container } = renderComponent();
		const sidebarElement = container.querySelector('aside#sidebar');
		expect(sidebarElement).toBeInTheDocument();
	});

	it('should render ChatSidebar component in sidebar slot', () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId('chat-sidebar')).toBeInTheDocument();
	});

	it('should wrap ChatSidebar in Suspense', () => {
		const { container } = renderComponent();
		const sidebarElement = container.querySelector('aside#sidebar');
		expect(sidebarElement).toBeInTheDocument();
		expect(sidebarElement?.textContent).toContain('Chat Sidebar');
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
					ChatSidebar: {
						template: '<div data-test-id="chat-sidebar">Chat Sidebar</div>',
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
		expect(getByTestId('chat-sidebar')).toBeInTheDocument();
		expect(getByText('Main Content Area')).toBeInTheDocument();
	});
});
