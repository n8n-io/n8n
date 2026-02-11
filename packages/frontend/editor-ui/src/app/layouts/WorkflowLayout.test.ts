import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import WorkflowLayout from './WorkflowLayout.vue';
import { computed, ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';

vi.mock('vue-router', async (importOriginal) => {
	const actual = (await importOriginal()) as object;
	return {
		...actual,
		useRoute: () => ({
			params: { name: 'test-workflow-id' },
			query: {},
			meta: {},
			name: 'workflow',
		}),
		useRouter: () => ({
			replace: vi.fn(),
			push: vi.fn(),
		}),
	};
});

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

vi.mock('@/app/composables/useWorkflowState', () => ({
	useWorkflowState: vi.fn(() => ({
		getNewWorkflowDataAndMakeShareable: vi.fn(),
		setWorkflowId: vi.fn(),
		resetState: vi.fn(),
	})),
}));

vi.mock('@/app/composables/useWorkflowInitialization', () => ({
	useWorkflowInitialization: vi.fn(() => ({
		isLoading: ref(false),
		workflowId: computed(() => 'test-workflow-id'),
		isTemplateRoute: computed(() => false),
		isOnboardingRoute: computed(() => false),
		initializeData: vi.fn().mockResolvedValue(undefined),
		initializeWorkflow: vi.fn().mockResolvedValue(undefined),
		cleanup: vi.fn(),
	})),
}));

const defaultStubs = {
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
	LoadingView: {
		template: '<div data-test-id="loading-view">Loading...</div>',
	},
	RouterView: {
		template: '<div>Workflow Content</div>',
	},
	Suspense: {
		template: '<div><slot /></div>',
	},
};

const renderComponent = createComponentRenderer(WorkflowLayout, {
	global: {
		stubs: defaultStubs,
	},
});

describe('WorkflowLayout', () => {
	beforeEach(() => {
		createTestingPinia();
		vi.clearAllMocks();
	});

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

	it('should render RouterView content when not loading', () => {
		const { getByText } = renderComponent();
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
		const { getByText, getByTestId } = renderComponent();
		expect(getByTestId('app-header')).toBeInTheDocument();
		expect(getByTestId('app-sidebar')).toBeInTheDocument();
		expect(getByText('Workflow Content')).toBeInTheDocument();
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
		const { container, getByText, getByTestId } = renderComponent();
		expect(container.querySelector('.app-grid')).toBeInTheDocument();
		expect(container.querySelector('header#header')).toBeInTheDocument();
		expect(container.querySelector('aside#sidebar')).toBeInTheDocument();
		expect(container.querySelector('main#content')).toBeInTheDocument();
		expect(getByTestId('app-header')).toBeInTheDocument();
		expect(getByTestId('app-sidebar')).toBeInTheDocument();
		expect(getByText('Workflow Content')).toBeInTheDocument();
	});
});
