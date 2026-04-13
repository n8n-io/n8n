import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/vue';
import { defineComponent, h, reactive, ref } from 'vue';
import InstanceAiView from '../InstanceAiView.vue';

class ResizeObserverMock {
	observe(): void {}
	disconnect(): void {}
}

const localStorageStub = {
	getItem: vi.fn(() => 'false'),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn(),
};

const originalResizeObserver = globalThis.ResizeObserver;
const originalLocalStorage = globalThis.localStorage;

let didStubResizeObserver = false;

const createStoreState = () =>
	reactive({
		threads: [] as unknown[],
		currentThreadId: 'thread-1',
		messages: [] as unknown[],
		isLowCredits: false,
		sseState: 'connected',
		creditsRemaining: 100,
		creditsQuota: 200,
		hasMessages: false,
		isHydratingThread: false,
		isStreaming: false,
		debugMode: false,
		loadThreads: vi.fn(),
		fetchCredits: vi.fn(),
		startCreditsPushListener: vi.fn(),
		stopCreditsPushListener: vi.fn(),
		closeSSE: vi.fn(),
		loadHistoricalMessages: vi.fn(async () => 'applied'),
		loadThreadStatus: vi.fn(),
		connectSSE: vi.fn(),
		switchThread: vi.fn(),
		sendMessage: vi.fn(),
		cancelRun: vi.fn(),
	});

const storeRef = { current: createStoreState() };
const routeRef = reactive({
	params: {} as Record<string, unknown>,
	path: '/instance-ai',
	matched: [] as unknown[],
	fullPath: '/instance-ai',
	query: {} as Record<string, unknown>,
	hash: '',
	meta: {} as Record<string, unknown>,
});

vi.mock('../instanceAi.store', () => ({
	useInstanceAiStore: () => storeRef.current,
}));

vi.mock('../instanceAiSettings.store', () => ({
	useInstanceAiSettingsStore: () => ({
		isLocalGatewayDisabled: true,
		refreshModuleSettings: vi.fn(async () => undefined),
		startDaemonProbing: vi.fn(),
		startGatewayPushListener: vi.fn(),
		pollGatewayStatus: vi.fn(),
		stopDaemonProbing: vi.fn(),
		stopGatewayPolling: vi.fn(),
		stopGatewayPushListener: vi.fn(),
	}),
}));

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => ({
		pushConnect: vi.fn(),
		pushDisconnect: vi.fn(),
	}),
}));

vi.mock('@/features/integrations/sourceControl.ee/sourceControl.store', () => ({
	useSourceControlStore: () => ({
		preferences: {
			branchReadOnly: false,
		},
	}),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		pushRef: 'push-ref-1',
	}),
}));

vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({
		set: vi.fn(),
	}),
}));

vi.mock('@/app/composables/usePageRedirectionHelper', () => ({
	usePageRedirectionHelper: () => ({
		goToUpgrade: vi.fn(),
	}),
}));

vi.mock('vue-router', () => ({
	useRoute: () => routeRef,
	useRouter: () => ({
		push: vi.fn(),
	}),
}));

vi.mock('@vueuse/core', () => ({
	useScroll: () => ({
		arrivedState: { bottom: true },
	}),
	useWindowSize: () => ({
		width: ref(1200),
	}),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

vi.mock('@n8n/design-system', () => ({
	N8nHeading: {
		name: 'N8nHeadingStub',
		template: '<div><slot /></div>',
	},
	N8nIconButton: {
		name: 'N8nIconButtonStub',
		template: '<button />',
	},
	N8nResizeWrapper: {
		name: 'N8nResizeWrapperStub',
		template: '<div><slot /></div>',
	},
	N8nScrollArea: {
		name: 'N8nScrollAreaStub',
		template: '<div><slot /></div>',
	},
	N8nText: {
		name: 'N8nTextStub',
		template: '<div><slot /></div>',
	},
}));

const previewMock = {
	isPreviewVisible: ref(false),
	activeWorkflowId: ref(null),
	activeExecutionId: ref(null),
	activeDataTableId: ref(null),
	activeDataTableProjectId: ref(null),
	allArtifactTabs: ref([]),
	activeTabId: ref(null),
	workflowRefreshKey: ref(0),
	dataTableRefreshKey: ref(0),
	openWorkflowPreview: vi.fn(),
	openDataTablePreview: vi.fn(),
	selectTab: vi.fn(),
	closePreview: vi.fn(),
	markUserSentMessage: vi.fn(),
};

vi.mock('../useCanvasPreview', () => ({
	useCanvasPreview: () => previewMock,
}));

vi.mock('../useEventRelay', () => ({
	useEventRelay: () => ({
		handleIframeReady: vi.fn(),
	}),
}));

const executionTracking = {
	workflowExecutions: ref(new Map()),
	clearAll: vi.fn(),
	cleanup: vi.fn(),
	getBufferedEvents: vi.fn(() => []),
};

vi.mock('../useExecutionPushEvents', () => ({
	useExecutionPushEvents: () => executionTracking,
}));

vi.mock('../components/InstanceAiThreadList.vue', () => ({
	default: {
		name: 'InstanceAiThreadListStub',
		template: '<div data-test-id="thread-list" />',
	},
}));

vi.mock('../components/InstanceAiEmptyState.vue', () => ({
	default: {
		name: 'InstanceAiEmptyStateStub',
		template: '<div data-test-id="empty-state" />',
	},
}));

vi.mock('../components/InstanceAiStatusBar.vue', () => ({
	default: {
		name: 'InstanceAiStatusBarStub',
		template: '<div data-test-id="status-bar" />',
	},
}));

vi.mock('../components/InstanceAiInput.vue', () => ({
	default: defineComponent({
		name: 'InstanceAiInputStub',
		props: {
			suggestions: {
				type: Array,
				required: false,
			},
			isStreaming: {
				type: Boolean,
				required: false,
			},
		},
		setup(props, { expose }) {
			expose({
				focus: vi.fn(),
			});

			return () =>
				h(
					'div',
					{ 'data-test-id': 'instance-ai-input-stub' },
					props.suggestions === undefined ? 'unset' : String(props.suggestions.length),
				);
		},
	}),
}));

vi.mock('../components/InstanceAiConfirmationPanel.vue', () => ({
	default: {
		name: 'InstanceAiConfirmationPanelStub',
		template: '<div data-test-id="confirmation-panel" />',
	},
}));

vi.mock('../components/InstanceAiMessage.vue', () => ({
	default: {
		name: 'InstanceAiMessageStub',
		template: '<div data-test-id="instance-ai-message" />',
	},
}));

vi.mock('../components/InstanceAiArtifactsPanel.vue', () => ({
	default: {
		name: 'InstanceAiArtifactsPanelStub',
		template: '<div data-test-id="artifacts-panel" />',
	},
}));

vi.mock('../components/InstanceAiMemoryPanel.vue', () => ({
	default: {
		name: 'InstanceAiMemoryPanelStub',
		template: '<div data-test-id="memory-panel" />',
	},
}));

vi.mock('../components/InstanceAiDebugPanel.vue', () => ({
	default: {
		name: 'InstanceAiDebugPanelStub',
		template: '<div data-test-id="debug-panel" />',
	},
}));

vi.mock('../components/InstanceAiPreviewTabBar.vue', () => ({
	default: {
		name: 'InstanceAiPreviewTabBarStub',
		template: '<div data-test-id="preview-tab-bar" />',
	},
}));

vi.mock('../components/InstanceAiWorkflowPreview.vue', () => ({
	default: {
		name: 'InstanceAiWorkflowPreviewStub',
		template: '<div data-test-id="workflow-preview" />',
	},
}));

vi.mock('../components/InstanceAiDataTablePreview.vue', () => ({
	default: {
		name: 'InstanceAiDataTablePreviewStub',
		template: '<div data-test-id="data-table-preview" />',
	},
}));

vi.mock('@/features/ai/assistant/components/Agent/CreditWarningBanner.vue', () => ({
	default: {
		name: 'CreditWarningBannerStub',
		template: '<div data-test-id="credit-warning-banner" />',
	},
}));

vi.mock('@/features/ai/assistant/components/Agent/CreditsSettingsDropdown.vue', () => ({
	default: {
		name: 'CreditsSettingsDropdownStub',
		template: '<div data-test-id="credits-dropdown" />',
	},
}));

const renderView = () => render(InstanceAiView);

describe('InstanceAiView', () => {
	beforeAll(() => {
		if (typeof globalThis.ResizeObserver === 'undefined') {
			vi.stubGlobal('ResizeObserver', ResizeObserverMock);
			didStubResizeObserver = true;
		}

		vi.stubGlobal('localStorage', localStorageStub);
	});

	beforeEach(() => {
		storeRef.current = createStoreState();
		routeRef.params = {};
		routeRef.path = '/instance-ai';
		routeRef.fullPath = '/instance-ai';
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	afterAll(() => {
		if (typeof originalLocalStorage === 'undefined') {
			Reflect.deleteProperty(globalThis, 'localStorage');
		} else {
			Object.defineProperty(globalThis, 'localStorage', {
				configurable: true,
				value: originalLocalStorage,
			});
		}

		if (didStubResizeObserver) {
			if (typeof originalResizeObserver === 'undefined') {
				Reflect.deleteProperty(globalThis, 'ResizeObserver');
			} else {
				Object.defineProperty(globalThis, 'ResizeObserver', {
					configurable: true,
					value: originalResizeObserver,
				});
			}
		}
	});

	it('passes the fixed suggestions to the empty-state composer', () => {
		const { getByTestId } = renderView();

		expect(getByTestId('instance-ai-input-stub')).toHaveTextContent('4');
	});

	it('does not pass suggestions once the thread has messages', () => {
		storeRef.current.hasMessages = true;
		storeRef.current.messages = [
			{
				id: 'msg-1',
				role: 'user',
				content: 'hello',
				isStreaming: false,
				createdAt: '2026-04-01T00:00:00.000Z',
			},
		];

		const { getByTestId } = renderView();

		expect(getByTestId('instance-ai-input-stub')).toHaveTextContent('unset');
	});

	it('does not pass suggestions while an existing thread is hydrating', () => {
		storeRef.current.isHydratingThread = true;

		const { getByTestId } = renderView();

		expect(getByTestId('instance-ai-input-stub')).toHaveTextContent('unset');
	});

	it('does not reconnect when direct hydration is stale', async () => {
		storeRef.current.sseState = 'disconnected';
		storeRef.current.loadHistoricalMessages = vi.fn(async () => 'stale');

		renderView();

		await vi.waitFor(() => {
			expect(storeRef.current.loadHistoricalMessages).toHaveBeenCalledWith('thread-1');
		});
		expect(storeRef.current.loadThreadStatus).not.toHaveBeenCalled();
		expect(storeRef.current.connectSSE).not.toHaveBeenCalled();
	});

	it('reconnects on same-thread re-entry when hydration is skipped', async () => {
		routeRef.params = { threadId: 'thread-1' };
		routeRef.path = '/instance-ai/thread-1';
		routeRef.fullPath = '/instance-ai/thread-1';
		storeRef.current.currentThreadId = 'thread-1';
		storeRef.current.sseState = 'disconnected';
		storeRef.current.hasMessages = true;
		storeRef.current.messages = [
			{
				id: 'msg-history',
				role: 'assistant',
				content: 'already loaded',
				isStreaming: false,
				createdAt: '2026-04-01T00:00:00.000Z',
			},
		];
		storeRef.current.loadHistoricalMessages = vi.fn(async () => 'skipped');

		renderView();

		await vi.waitFor(() => {
			expect(storeRef.current.loadHistoricalMessages).toHaveBeenCalledWith('thread-1');
		});
		expect(storeRef.current.loadThreadStatus).toHaveBeenCalledWith('thread-1');
		expect(storeRef.current.connectSSE).toHaveBeenCalledWith('thread-1');
	});
});
