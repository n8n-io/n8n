import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { fireEvent } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import InstanceAiView from '../InstanceAiView.vue';
import { useInstanceAiStore } from '../instanceAi.store';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';

vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({ set: vi.fn() }),
}));

vi.mock('@/app/composables/usePageRedirectionHelper', () => ({
	usePageRedirectionHelper: () => ({ goToUpgrade: vi.fn() }),
}));

const vueUseMockState = vi.hoisted(
	() =>
		({
			windowWidth: undefined as { value: number } | undefined,
			mainSidebarCollapsed: undefined as { value: boolean } | undefined,
			mainSidebarWidth: undefined as { value: number } | undefined,
		}) satisfies {
			windowWidth: { value: number } | undefined;
			mainSidebarCollapsed: { value: boolean } | undefined;
			mainSidebarWidth: { value: number } | undefined;
		},
);

vi.mock('@/app/composables/useSidebarLayout', () => ({
	COLLAPSED_MAIN_SIDEBAR_WIDTH: 42,
	useSidebarLayout: () => ({
		isCollapsed: vueUseMockState.mainSidebarCollapsed!,
		sidebarWidth: vueUseMockState.mainSidebarWidth!,
	}),
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRoute: () => ({
		params: {},
		path: '/instance-ai',
		matched: [],
		fullPath: '/instance-ai',
		query: {},
		hash: '',
		meta: {},
	}),
	useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@vueuse/core', async (importOriginal) => ({
	...(await importOriginal()),
	useScroll: () => ({ arrivedState: { bottom: true } }),
	useWindowSize: () => ({ width: vueUseMockState.windowWidth! }),
	useLocalStorage: (_key: string, defaultValue: unknown) => ref(defaultValue),
	useSessionStorage: (_key: string, defaultValue: unknown) => ref(defaultValue),
}));

beforeAll(async () => {
	const { ref: vueRef } = await import('vue');
	vueUseMockState.windowWidth = vueRef(1200);
	vueUseMockState.mainSidebarCollapsed = vueRef(true);
	vueUseMockState.mainSidebarWidth = vueRef(200);
});

const InstanceAiInputStub = defineComponent({
	name: 'InstanceAiInputStub',
	props: {
		suggestions: { type: Array, required: false },
		isStreaming: { type: Boolean, required: false },
	},
	setup(props, { expose }) {
		expose({ focus: vi.fn() });
		return () =>
			h(
				'div',
				{ 'data-test-id': 'instance-ai-input-stub' },
				props.suggestions === undefined ? 'unset' : String(props.suggestions.length),
			);
	},
});

const InstanceAiArtifactsPanelStub = defineComponent({
	name: 'InstanceAiArtifactsPanelStub',
	props: {
		isPinned: { type: Boolean, required: false, default: true },
		isPinningAvailable: { type: Boolean, required: false, default: true },
	},
	emits: ['togglePinned'],
	setup(props, { attrs, emit }) {
		return () =>
			h(
				'aside',
				{
					...attrs,
					'data-test-id': 'instance-ai-artifacts-sidebar-stub',
					'data-pinned': String(props.isPinned),
					'data-pinning-available': String(props.isPinningAvailable),
				},
				[
					props.isPinningAvailable
						? h(
								'button',
								{
									'data-test-id': 'instance-ai-artifacts-sidebar-pin-stub',
									onClick: () => emit('togglePinned'),
								},
								'pin',
							)
						: undefined,
				],
			);
	},
});

const InstanceAiPreviewTabBarStub = defineComponent({
	name: 'InstanceAiPreviewTabBarStub',
	props: {
		activeTabId: { type: String, required: false },
		isExpanded: { type: Boolean, required: false },
	},
	emits: ['toggleExpanded'],
	setup(props, { emit }) {
		return () =>
			h('div', { 'data-test-id': 'instance-ai-preview-tabbar' }, [
				h(
					'span',
					{ 'data-test-id': 'instance-ai-preview-expanded-state' },
					String(props.isExpanded),
				),
				h(
					'button',
					{
						'data-test-id': 'instance-ai-preview-expand-toggle-stub',
						onClick: () => emit('toggleExpanded'),
					},
					props.activeTabId,
				),
			]);
	},
});

const instanceAiViewStubs = {
	InstanceAiArtifactsPanel: InstanceAiArtifactsPanelStub,
	InstanceAiInput: InstanceAiInputStub,
	InstanceAiPreviewTabBar: InstanceAiPreviewTabBarStub,
	InstanceAiWorkflowPreview: { template: '<div data-test-id="workflow-preview-stub" />' },
};

const renderView = createComponentRenderer(InstanceAiView, {
	global: {
		stubs: instanceAiViewStubs,
	},
});

describe('InstanceAiView', () => {
	let store: ReturnType<typeof mockedStore<typeof useInstanceAiStore>>;
	let settingsStore: ReturnType<typeof mockedStore<typeof useInstanceAiSettingsStore>>;

	beforeEach(() => {
		vueUseMockState.windowWidth!.value = 1200;
		vueUseMockState.mainSidebarCollapsed!.value = true;
		vueUseMockState.mainSidebarWidth!.value = 200;

		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);

		store = mockedStore(useInstanceAiStore);
		settingsStore = mockedStore(useInstanceAiSettingsStore);
		const pushStore = mockedStore(usePushConnectionStore);

		store.currentThreadId = 'thread-1';
		store.loadThreads.mockResolvedValue(true);
		store.fetchCredits.mockResolvedValue(undefined);
		store.loadHistoricalMessages.mockResolvedValue('applied');
		store.connectSSE.mockResolvedValue(undefined);
		store.closeSSE.mockReturnValue(undefined);
		settingsStore.isLocalGatewayDisabled = true;
		settingsStore.refreshModuleSettings.mockResolvedValue(undefined);
		pushStore.pushConnect.mockReturnValue(undefined);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('passes the fixed suggestions to the empty-state composer', () => {
		const { getByTestId, queryByTestId } = renderView();
		expect(getByTestId('instance-ai-input-stub')).toHaveTextContent('4');
		expect(queryByTestId('instance-ai-artifacts-sidebar-stub')).not.toBeInTheDocument();
		expect(queryByTestId('instance-ai-artifacts-sidebar-edge')).not.toBeInTheDocument();
	});

	it('does not pass suggestions once the thread has messages', () => {
		store.hasMessages = true;
		store.messages = [
			{
				id: 'msg-1',
				role: 'user',
				content: 'hello',
				isStreaming: false,
				createdAt: '2026-04-01T00:00:00.000Z',
			},
		] as typeof store.messages;

		const { getByTestId } = renderView({ props: { threadId: 'thread-1' } });
		expect(getByTestId('instance-ai-input-stub')).toHaveTextContent('unset');
	});

	it('does not pass suggestions while an existing thread is hydrating', () => {
		store.isHydratingThread = true;

		const { getByTestId } = renderView({ props: { threadId: 'thread-1' } });
		expect(getByTestId('instance-ai-input-stub')).toHaveTextContent('unset');
		expect(getByTestId('instance-ai-artifacts-sidebar-stub')).toBeVisible();
	});

	it('toggles the tabbed artifacts preview and hides the compact artifacts sidebar', async () => {
		store.hasMessages = true;
		store.messages = [
			{
				id: 'msg-1',
				role: 'assistant',
				content: 'Created a workflow',
				reasoning: '',
				isStreaming: false,
				createdAt: '2026-04-01T00:00:00.000Z',
				agentTree: {
					agentId: 'agent-1',
					role: 'orchestrator',
					status: 'completed',
					textContent: '',
					reasoning: '',
					toolCalls: [
						{
							toolCallId: 'tc-1',
							toolName: 'build-workflow',
							args: {},
							isLoading: false,
							result: { workflowId: 'wf-1', workflowName: 'Preview workflow' },
						},
					],
					children: [],
					timeline: [],
				},
			},
		] as typeof store.messages;

		const { container, getByTestId, queryByTestId, rerender } = renderView({
			props: { threadId: 'thread-1' },
		});
		const getPreviewPanelTransition = () => {
			const transition = container.querySelector('transition-stub[name="preview-panel-slide"]');
			expect(transition).not.toBeNull();
			return transition as HTMLElement;
		};
		const toggle = getByTestId('instance-ai-artifacts-preview-toggle');
		const previewTabBar = getByTestId('instance-ai-preview-tabbar');

		expect(toggle).toHaveAttribute('aria-label', 'Show artifacts preview');
		expect(toggle).toHaveAttribute('aria-pressed', 'false');
		expect(getByTestId('instance-ai-artifacts-sidebar-stub')).toBeVisible();
		expect(previewTabBar).not.toBeVisible();
		expect(getPreviewPanelTransition()).toHaveAttribute('css', 'false');
		expect(getByTestId('instance-ai-content-area')).toHaveAttribute(
			'data-layout-transitions-enabled',
			'false',
		);

		await vi.waitFor(() => {
			expect(getPreviewPanelTransition()).toHaveAttribute('css', 'true');
			expect(getByTestId('instance-ai-content-area')).toHaveAttribute(
				'data-layout-transitions-enabled',
				'true',
			);
		});

		await fireEvent.click(toggle);

		expect(toggle).toHaveAttribute('aria-label', 'Hide artifacts preview');
		expect(toggle).toHaveAttribute('aria-pressed', 'true');
		expect(queryByTestId('instance-ai-artifacts-sidebar-stub')).not.toBeInTheDocument();
		expect(previewTabBar).toBeVisible();
		expect(getByTestId('instance-ai-preview-panel')).toHaveAttribute('data-expanded', 'false');

		await rerender({ threadId: 'thread-2' });

		expect(getPreviewPanelTransition()).toHaveAttribute('css', 'false');
		expect(getByTestId('instance-ai-content-area')).toHaveAttribute(
			'data-layout-transitions-enabled',
			'false',
		);
		await vi.waitFor(() => {
			expect(getPreviewPanelTransition()).toHaveAttribute('css', 'true');
			expect(getByTestId('instance-ai-content-area')).toHaveAttribute(
				'data-layout-transitions-enabled',
				'true',
			);
		});

		await fireEvent.click(getByTestId('instance-ai-preview-expand-toggle-stub'));

		expect(getByTestId('instance-ai-preview-expanded-state')).toHaveTextContent('true');
		expect(getByTestId('instance-ai-preview-panel')).toHaveAttribute('data-expanded', 'true');

		await fireEvent.click(getByTestId('instance-ai-preview-expand-toggle-stub'));

		expect(getByTestId('instance-ai-preview-expanded-state')).toHaveTextContent('false');
		expect(getByTestId('instance-ai-preview-panel')).toHaveAttribute('data-expanded', 'false');

		await fireEvent.click(toggle);

		expect(toggle).toHaveAttribute('aria-label', 'Show artifacts preview');
		expect(toggle).toHaveAttribute('aria-pressed', 'false');
		expect(getByTestId('instance-ai-artifacts-sidebar-stub')).toBeVisible();
		expect(previewTabBar).not.toBeVisible();
	});

	it('lets the compact artifacts sidebar be unpinned and revealed from the right edge', async () => {
		store.hasMessages = true;
		store.messages = [
			{
				id: 'msg-1',
				role: 'user',
				content: 'hello',
				isStreaming: false,
				createdAt: '2026-04-01T00:00:00.000Z',
			},
		] as typeof store.messages;

		const { getByTestId, queryByTestId } = renderView({ props: { threadId: 'thread-1' } });

		expect(getByTestId('instance-ai-artifacts-sidebar-stub')).toHaveAttribute(
			'data-pinned',
			'true',
		);
		expect(queryByTestId('instance-ai-artifacts-sidebar-edge')).not.toBeInTheDocument();

		await fireEvent.click(getByTestId('instance-ai-artifacts-sidebar-pin-stub'));

		expect(getByTestId('instance-ai-artifacts-sidebar-stub')).toHaveAttribute(
			'data-pinned',
			'false',
		);
		expect(getByTestId('instance-ai-artifacts-sidebar-edge')).toBeInTheDocument();

		await fireEvent.mouseLeave(getByTestId('instance-ai-artifacts-sidebar-slot'));

		expect(queryByTestId('instance-ai-artifacts-sidebar-stub')).not.toBeInTheDocument();

		await fireEvent.mouseEnter(getByTestId('instance-ai-artifacts-sidebar-edge'));

		expect(getByTestId('instance-ai-artifacts-sidebar-stub')).toHaveAttribute(
			'data-pinned',
			'false',
		);

		await fireEvent.click(getByTestId('instance-ai-artifacts-sidebar-pin-stub'));

		expect(getByTestId('instance-ai-artifacts-sidebar-stub')).toHaveAttribute(
			'data-pinned',
			'true',
		);
		expect(queryByTestId('instance-ai-artifacts-sidebar-edge')).not.toBeInTheDocument();
	});

	it('overrides pinned compact artifacts sidebar when available chat width is narrow', async () => {
		vueUseMockState.windowWidth!.value = 1200;
		store.hasMessages = true;
		store.messages = [
			{
				id: 'msg-1',
				role: 'user',
				content: 'hello',
				isStreaming: false,
				createdAt: '2026-04-01T00:00:00.000Z',
			},
		] as typeof store.messages;

		const { getByTestId, queryByTestId } = renderView({ props: { threadId: 'thread-1' } });

		expect(getByTestId('instance-ai-artifacts-sidebar-stub')).toHaveAttribute(
			'data-pinned',
			'true',
		);
		expect(getByTestId('instance-ai-artifacts-sidebar-stub')).toHaveAttribute(
			'data-pinning-available',
			'true',
		);
		expect(getByTestId('instance-ai-artifacts-sidebar-pin-stub')).toBeInTheDocument();

		await fireEvent.click(getByTestId('instance-ai-sidebar-toggle'));

		expect(queryByTestId('instance-ai-artifacts-sidebar-stub')).not.toBeInTheDocument();
		expect(getByTestId('instance-ai-artifacts-sidebar-edge')).toBeInTheDocument();

		await fireEvent.mouseEnter(getByTestId('instance-ai-artifacts-sidebar-edge'));

		expect(getByTestId('instance-ai-artifacts-sidebar-stub')).toHaveAttribute(
			'data-pinned',
			'false',
		);
		expect(getByTestId('instance-ai-artifacts-sidebar-stub')).toHaveAttribute(
			'data-pinning-available',
			'false',
		);
		expect(queryByTestId('instance-ai-artifacts-sidebar-pin-stub')).not.toBeInTheDocument();

		vueUseMockState.windowWidth!.value = 1300;
		await nextTick();

		expect(getByTestId('instance-ai-artifacts-sidebar-stub')).toHaveAttribute(
			'data-pinned',
			'true',
		);
		expect(getByTestId('instance-ai-artifacts-sidebar-stub')).toHaveAttribute(
			'data-pinning-available',
			'true',
		);
		expect(getByTestId('instance-ai-artifacts-sidebar-pin-stub')).toBeInTheDocument();
		expect(queryByTestId('instance-ai-artifacts-sidebar-edge')).not.toBeInTheDocument();
	});

	it('accounts for the main app sidebar when deciding if pinning is available', async () => {
		vueUseMockState.windowWidth!.value = 950;
		vueUseMockState.mainSidebarCollapsed!.value = true;
		store.hasMessages = true;
		store.messages = [
			{
				id: 'msg-1',
				role: 'user',
				content: 'hello',
				isStreaming: false,
				createdAt: '2026-04-01T00:00:00.000Z',
			},
		] as typeof store.messages;

		const { getByTestId, queryByTestId } = renderView({ props: { threadId: 'thread-1' } });

		expect(getByTestId('instance-ai-artifacts-sidebar-stub')).toHaveAttribute(
			'data-pinned',
			'true',
		);
		expect(getByTestId('instance-ai-artifacts-sidebar-stub')).toHaveAttribute(
			'data-pinning-available',
			'true',
		);

		vueUseMockState.mainSidebarCollapsed!.value = false;
		await nextTick();

		expect(queryByTestId('instance-ai-artifacts-sidebar-stub')).not.toBeInTheDocument();
		expect(getByTestId('instance-ai-artifacts-sidebar-edge')).toBeInTheDocument();

		await fireEvent.mouseEnter(getByTestId('instance-ai-artifacts-sidebar-edge'));

		expect(getByTestId('instance-ai-artifacts-sidebar-stub')).toHaveAttribute(
			'data-pinned',
			'false',
		);
		expect(getByTestId('instance-ai-artifacts-sidebar-stub')).toHaveAttribute(
			'data-pinning-available',
			'false',
		);
		expect(queryByTestId('instance-ai-artifacts-sidebar-pin-stub')).not.toBeInTheDocument();

		vueUseMockState.mainSidebarCollapsed!.value = true;
		await nextTick();

		expect(getByTestId('instance-ai-artifacts-sidebar-stub')).toHaveAttribute(
			'data-pinned',
			'true',
		);
		expect(getByTestId('instance-ai-artifacts-sidebar-stub')).toHaveAttribute(
			'data-pinning-available',
			'true',
		);
		expect(getByTestId('instance-ai-artifacts-sidebar-pin-stub')).toBeInTheDocument();
	});

	it('renders the compact artifacts sidebar without animation on thread initialization', async () => {
		store.hasMessages = true;
		store.messages = [
			{
				id: 'msg-1',
				role: 'user',
				content: 'hello',
				isStreaming: false,
				createdAt: '2026-04-01T00:00:00.000Z',
			},
		] as typeof store.messages;

		const { container, getByTestId, rerender } = renderView({
			props: { threadId: 'thread-1' },
		});
		const getArtifactsPanelTransition = () => {
			const transition = container.querySelector('transition-stub[name="artifacts-panel-fade"]');
			expect(transition).not.toBeNull();
			return transition as HTMLElement;
		};

		expect(getByTestId('instance-ai-artifacts-sidebar-stub')).toBeVisible();
		expect(getArtifactsPanelTransition()).toHaveAttribute('css', 'false');

		await vi.waitFor(() => {
			expect(getArtifactsPanelTransition()).toHaveAttribute('css', 'true');
		});

		await rerender({ threadId: 'thread-2' });

		expect(getArtifactsPanelTransition()).toHaveAttribute('css', 'false');
		await vi.waitFor(() => {
			expect(getArtifactsPanelTransition()).toHaveAttribute('css', 'true');
		});
	});

	it('clears the current thread when mounted on the base route (AI-2408)', async () => {
		// Default setup has store.currentThreadId = 'thread-1'. Rendering the
		// view WITHOUT a `threadId` prop simulates landing on /instance-ai
		// (fresh load, back button, or AI Assistant nav link). The view must
		// reset the store so the sidebar doesn't keep highlighting 'thread-1'
		// alongside the empty main view.
		store.sseState = 'disconnected';

		renderView();

		await vi.waitFor(() => {
			expect(store.clearCurrentThread).toHaveBeenCalled();
		});
		expect(store.loadHistoricalMessages).not.toHaveBeenCalled();
		expect(store.loadThreadStatus).not.toHaveBeenCalled();
		expect(store.connectSSE).not.toHaveBeenCalled();
	});

	it('reconnects on same-thread re-entry (thread route, SSE disconnected)', async () => {
		store.currentThreadId = 'thread-1';
		store.sseState = 'disconnected';
		store.hasMessages = true;
		store.messages = [
			{
				id: 'msg-history',
				role: 'assistant',
				content: 'already loaded',
				reasoning: '',
				isStreaming: false,
				createdAt: '2026-04-01T00:00:00.000Z',
			},
		] as typeof store.messages;
		store.loadHistoricalMessages.mockResolvedValue('skipped');

		// Render WITH the threadId prop — this is the thread-route re-entry
		// path (user lands on /instance-ai/thread-1 after SSE was torn down).
		renderView({ props: { threadId: 'thread-1' } });

		await vi.waitFor(() => {
			expect(store.loadHistoricalMessages).toHaveBeenCalledWith('thread-1');
		});
		expect(store.loadThreadStatus).toHaveBeenCalledWith('thread-1');
		expect(store.connectSSE).toHaveBeenCalledWith('thread-1');
	});
});
