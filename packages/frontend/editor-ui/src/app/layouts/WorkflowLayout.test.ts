import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import WorkflowLayout from './WorkflowLayout.vue';
import { computed, ref, shallowRef } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { useSettingsStore } from '@n8n/stores/settings.store';

const mockRoute = vi.hoisted(() => ({
	params: { workflowId: 'test-workflow-id', ticket: '' },
	query: {},
	meta: { oemPrototype: false },
	name: 'workflow',
}));

vi.mock('vue-router', async (importOriginal) => {
	const actual = (await importOriginal()) as object;
	return {
		...actual,
		useRoute: () => mockRoute,
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

vi.mock('@/app/composables/useWorkflowInitialization', () => ({
	useWorkflowInitialization: vi.fn(() => ({
		isLoading: ref(false),
		workflowId: computed(() => 'test-workflow-id'),
		currentWorkflowDocumentStore: shallowRef({ documentId: 'test-doc-id' }),
		isTemplateRoute: computed(() => false),
		isOnboardingRoute: computed(() => false),
		isDebugRoute: computed(() => false),
		initializeData: vi.fn().mockResolvedValue(undefined),
		initializeWorkflow: vi.fn().mockResolvedValue(undefined),
		handleDebugModeRoute: vi.fn().mockResolvedValue(undefined),
		cleanup: vi.fn(),
	})),
}));

vi.mock('@/app/composables/usePostMessageHandler', () => ({
	usePostMessageHandler: vi.fn(() => ({
		setup: vi.fn(),
		cleanup: vi.fn(),
	})),
}));

const mockPushConnect = vi.fn();
const mockPushDisconnect = vi.fn();
vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: vi.fn(() => ({
		pushConnect: mockPushConnect,
		pushDisconnect: mockPushDisconnect,
	})),
}));

const defaultStubs = {
	AppHeader: {
		props: ['forceFullHeader'],
		template:
			'<div data-test-id="app-header" :data-force-full-header="forceFullHeader">App Header</div>',
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
	CanvasChatOverlay: {
		template: '<div data-test-id="canvas-chat-overlay" />',
	},
	AppChatPanel: {
		template: '<div data-test-id="app-chat-panel">Chat Panel</div>',
	},
	LoadingView: {
		template: '<div data-test-id="loading-view">Loading...</div>',
	},
	OemPrototypeTopBar: {
		template: '<div data-test-id="oem-prototype-top-bar">Prototype Top Bar</div>',
	},
	OemPrototypeWarning: {
		template: '<div data-test-id="oem-prototype-warning">Prototype Warning</div>',
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
		mockRoute.params.ticket = '';
		mockRoute.meta.oemPrototype = false;
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

	it('should preserve the full editor header on an OEM prototype', () => {
		mockRoute.params.ticket = 'API-305';
		mockRoute.meta.oemPrototype = true;
		useSettingsStore().settings.canvasOnly = true;

		const { getByTestId, getByText, queryByTestId } = renderComponent();

		const topBar = getByTestId('oem-prototype-top-bar');
		const warning = getByTestId('oem-prototype-warning');
		const appHeader = getByTestId('app-header');

		expect(topBar.compareDocumentPosition(warning)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
		expect(warning.compareDocumentPosition(appHeader)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
		expect(appHeader).toHaveAttribute('data-force-full-header');
		expect(queryByTestId('app-sidebar')).not.toBeInTheDocument();
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

	it('should call pushConnect on mount', () => {
		renderComponent();
		expect(mockPushConnect).toHaveBeenCalledOnce();
	});

	it('should call pushDisconnect on unmount', () => {
		const { unmount } = renderComponent();
		unmount();
		expect(mockPushDisconnect).toHaveBeenCalledOnce();
	});

	it('should show LoadingView instead of RouterView while the document store is not yet available', async () => {
		// During a workflow load/switch the provided document store is briefly null (disposed
		// before the new one is created). NodeView must not mount in that window, or its strict
		// injectNDVStore() reads throw and the canvas renders zero nodes.
		const { useWorkflowInitialization } = await import(
			'@/app/composables/useWorkflowInitialization'
		);
		const state = useWorkflowInitialization();
		state.currentWorkflowDocumentStore.value = null;
		vi.mocked(useWorkflowInitialization).mockReturnValueOnce(state);

		const { getByTestId, queryByText } = renderComponent();

		expect(getByTestId('loading-view')).toBeInTheDocument();
		expect(queryByText('Workflow Content')).not.toBeInTheDocument();
	});

	it('should show LoadingView while loading even with a document store present', async () => {
		const { useWorkflowInitialization } = await import(
			'@/app/composables/useWorkflowInitialization'
		);
		const state = useWorkflowInitialization();
		state.isLoading.value = true;
		vi.mocked(useWorkflowInitialization).mockReturnValueOnce(state);

		const { getByTestId, queryByText } = renderComponent();

		expect(getByTestId('loading-view')).toBeInTheDocument();
		expect(queryByText('Workflow Content')).not.toBeInTheDocument();
	});

	it('should render RouterView on the onboarding route even when the document store is null', async () => {
		// The onboarding route renders a redirect-only view whose onMounted performs the
		// redirect and never provides a document store. The store gate must not block it,
		// or the redirect never fires and the page deadlocks on LoadingView.
		const { useWorkflowInitialization } = await import(
			'@/app/composables/useWorkflowInitialization'
		);
		const state = useWorkflowInitialization();
		state.currentWorkflowDocumentStore.value = null;
		vi.mocked(useWorkflowInitialization).mockReturnValueOnce({
			...state,
			isOnboardingRoute: computed(() => true),
		});

		const { queryByTestId, getByText } = renderComponent();

		expect(queryByTestId('loading-view')).not.toBeInTheDocument();
		expect(getByText('Workflow Content')).toBeInTheDocument();
	});
});
