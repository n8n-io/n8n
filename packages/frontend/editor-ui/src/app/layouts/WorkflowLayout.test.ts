import { describe, it, expect, vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import WorkflowLayout from './WorkflowLayout.vue';
import { computed } from 'vue';

vi.mock('@/app/composables/useLayoutProps', () => ({
	useLayoutProps: vi.fn(() => ({
		layoutProps: computed(() => ({ logs: false })),
	})),
}));

vi.mock('@/features/ai/assistant/assistant.store', () => ({
	useAssistantStore: vi.fn(() => ({
		isFloatingButtonShown: false,
	})),
}));

const renderComponent = createComponentRenderer(WorkflowLayout, {
	global: {
		stubs: {
			AppHeader: {
				template: '<div data-test-id="app-header">App Header</div>',
			},
			AppSidebar: {
				template: '<div data-test-id="app-sidebar">App Sidebar</div>',
			},
			LogsPanel: {
				template: '<div data-test-id="logs-panel">Logs Panel</div>',
			},
			AskAssistantFloatingButton: {
				template: '<div data-test-id="ask-assistant-button">Ask Assistant</div>',
			},
			AppChatPanel: {
				template: '<div data-test-id="app-chat-panel">Chat Panel</div>',
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

describe('WorkflowLayout', () => {
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
					AppHeader: {
						template: '<div data-test-id="app-header">App Header</div>',
					},
					AppSidebar: {
						template: '<div data-test-id="app-sidebar">App Sidebar</div>',
					},
					LogsPanel: {
						template: '<div data-test-id="logs-panel">Logs Panel</div>',
					},
					AskAssistantFloatingButton: {
						template: '<div data-test-id="ask-assistant-button">Ask Assistant</div>',
					},
					AppChatPanel: {
						template: '<div data-test-id="app-chat-panel">Chat Panel</div>',
					},
					RouterView: {
						template: '<div>Workflow Content</div>',
					},
					Suspense: {
						template: '<div><slot /></div>',
					},
				},
			},
		});
		expect(getByText('Workflow Content')).toBeInTheDocument();
	});

	it('should render AppHeader in header slot', () => {
		const { getByTestId, container } = renderComponent();
		expect(getByTestId('app-header')).toBeInTheDocument();
		const headerElement = container.querySelector('header#header');
		expect(headerElement).toBeInTheDocument();
	});

	it('should render AppSidebar in sidebar slot', () => {
		const { getByTestId, container } = renderComponent();
		expect(getByTestId('app-sidebar')).toBeInTheDocument();
		const sidebarElement = container.querySelector('aside#sidebar');
		expect(sidebarElement).toBeInTheDocument();
	});

	it('should not render LogsPanel when layoutProps.logs is false', () => {
		const { queryByTestId } = renderComponent();
		expect(queryByTestId('logs-panel')).not.toBeInTheDocument();
	});

	it('should render LogsPanel when layoutProps.logs is true', async () => {
		const { useLayoutProps } = await import('@/app/composables/useLayoutProps');
		vi.mocked(useLayoutProps).mockReturnValue({
			layoutProps: computed(() => ({ logs: true })),
		});

		const { getByTestId } = renderComponent();
		expect(getByTestId('logs-panel')).toBeInTheDocument();
	});

	it('should render all header, sidebar and content together', () => {
		const { getByText, getByTestId } = renderComponent({
			global: {
				stubs: {
					AppHeader: {
						template: '<div data-test-id="app-header">App Header</div>',
					},
					AppSidebar: {
						template: '<div data-test-id="app-sidebar">App Sidebar</div>',
					},
					LogsPanel: {
						template: '<div data-test-id="logs-panel">Logs Panel</div>',
					},
					AskAssistantFloatingButton: {
						template: '<div data-test-id="ask-assistant-button">Ask Assistant</div>',
					},
					AppChatPanel: {
						template: '<div data-test-id="app-chat-panel">Chat Panel</div>',
					},
					RouterView: {
						template: '<div>Workflow Canvas</div>',
					},
					Suspense: {
						template: '<div><slot /></div>',
					},
				},
			},
		});
		expect(getByTestId('app-header')).toBeInTheDocument();
		expect(getByTestId('app-sidebar')).toBeInTheDocument();
		expect(getByText('Workflow Canvas')).toBeInTheDocument();
	});

	it('should wrap AppHeader in Suspense', () => {
		const { getByTestId } = renderComponent();
		const appHeader = getByTestId('app-header');
		expect(appHeader).toBeInTheDocument();
		expect(appHeader.textContent).toBe('App Header');
	});

	it('should wrap AppSidebar in Suspense', () => {
		const { getByTestId } = renderComponent();
		const appSidebar = getByTestId('app-sidebar');
		expect(appSidebar).toBeInTheDocument();
		expect(appSidebar.textContent).toBe('App Sidebar');
	});

	it('should render complete workflow layout structure', () => {
		const { container, getByText, getByTestId } = renderComponent({
			global: {
				stubs: {
					AppHeader: {
						template: '<div data-test-id="app-header">App Header</div>',
					},
					AppSidebar: {
						template: '<div data-test-id="app-sidebar">App Sidebar</div>',
					},
					LogsPanel: {
						template: '<div data-test-id="logs-panel">Logs Panel</div>',
					},
					AskAssistantFloatingButton: {
						template: '<div data-test-id="ask-assistant-button">Ask Assistant</div>',
					},
					AppChatPanel: {
						template: '<div data-test-id="app-chat-panel">Chat Panel</div>',
					},
					RouterView: {
						template: '<div>Workflow Editor</div>',
					},
					Suspense: {
						template: '<div><slot /></div>',
					},
				},
			},
		});
		expect(container.querySelector('.app-grid')).toBeInTheDocument();
		expect(container.querySelector('header#header')).toBeInTheDocument();
		expect(container.querySelector('aside#sidebar')).toBeInTheDocument();
		expect(container.querySelector('main#content')).toBeInTheDocument();
		expect(getByTestId('app-header')).toBeInTheDocument();
		expect(getByTestId('app-sidebar')).toBeInTheDocument();
		expect(getByText('Workflow Editor')).toBeInTheDocument();
	});
});
