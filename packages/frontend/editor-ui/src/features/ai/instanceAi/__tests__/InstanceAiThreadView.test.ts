import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { fireEvent } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import InstanceAiThreadView from '../InstanceAiThreadView.vue';
import { useInstanceAiStore } from '../instanceAi.store';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { SidebarStateKey } from '../instanceAiLayout';

vi.mock('@/app/composables/usePageRedirectionHelper', () => ({
	usePageRedirectionHelper: () => ({ goToUpgrade: vi.fn() }),
}));

const layoutMockState = vi.hoisted(
	() =>
		({
			threadAreaWidth: undefined as { value: number } | undefined,
			instanceAiSidebarCollapsed: undefined as { value: boolean } | undefined,
			toggleSidebar: undefined as ReturnType<typeof vi.fn> | undefined,
		}) satisfies {
			threadAreaWidth: { value: number } | undefined;
			instanceAiSidebarCollapsed: { value: boolean } | undefined;
			toggleSidebar: ReturnType<typeof vi.fn> | undefined;
		},
);

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRoute: () => ({
		params: { threadId: 'thread-1' },
		path: '/instance-ai/thread-1',
		matched: [],
		fullPath: '/instance-ai/thread-1',
		query: {},
		hash: '',
		meta: {},
	}),
	useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@vueuse/core', async (importOriginal) => ({
	...(await importOriginal()),
	useElementSize: () => ({ width: layoutMockState.threadAreaWidth! }),
	useScroll: () => ({ arrivedState: { bottom: true } }),
	useSessionStorage: (_key: string, defaultValue: unknown) => ref(defaultValue),
}));

beforeAll(async () => {
	const { ref: vueRef } = await import('vue');
	layoutMockState.threadAreaWidth = vueRef(1200);
	layoutMockState.instanceAiSidebarCollapsed = vueRef(false);
	layoutMockState.toggleSidebar = vi.fn(() => {
		layoutMockState.instanceAiSidebarCollapsed!.value =
			!layoutMockState.instanceAiSidebarCollapsed!.value;
	});
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

const renderView = createComponentRenderer(InstanceAiThreadView, {
	global: {
		provide: {
			[SidebarStateKey as symbol]: {
				collapsed: layoutMockState.instanceAiSidebarCollapsed!,
				toggle: () => layoutMockState.toggleSidebar!(),
			},
		},
		stubs: {
			InstanceAiArtifactsPanel: InstanceAiArtifactsPanelStub,
			InstanceAiInput: InstanceAiInputStub,
			InstanceAiPreviewTabBar: InstanceAiPreviewTabBarStub,
			InstanceAiWorkflowPreview: { template: '<div data-test-id="workflow-preview-stub" />' },
		},
	},
});

describe('InstanceAiThreadView', () => {
	let store: ReturnType<typeof mockedStore<typeof useInstanceAiStore>>;

	beforeEach(() => {
		layoutMockState.threadAreaWidth!.value = 1200;
		layoutMockState.instanceAiSidebarCollapsed!.value = false;
		layoutMockState.toggleSidebar!.mockReset();
		layoutMockState.toggleSidebar!.mockImplementation(() => {
			layoutMockState.instanceAiSidebarCollapsed!.value =
				!layoutMockState.instanceAiSidebarCollapsed!.value;
		});

		// Default `stubActions: true` — every store action becomes a no-op spy.
		// Necessary because the store's actions delegate internally to the
		// thread runtime (e.g. `switchThread` calls `runtime.connectSSE`),
		// which would try to construct a real `EventSource` in jsdom.
		const pinia = createTestingPinia();
		setActivePinia(pinia);

		store = mockedStore(useInstanceAiStore);
		store.currentThreadId = 'thread-1';
		store.threads = [
			{
				id: 'thread-1',
				title: 'Test thread',
				createdAt: '2026-04-01T00:00:00.000Z',
				updatedAt: '2026-04-01T00:00:00.000Z',
			},
		] as typeof store.threads;
		store.loadHistoricalMessages.mockResolvedValue('applied');

		// `useExecutionPushEvents` (consumed by ThreadView) registers a push
		// listener and stores the returned removeListener; it gets invoked on
		// component unmount. Auto-stubbed actions return undefined by default,
		// so return a no-op function to keep cleanup well-typed.
		const pushStore = mockedStore(usePushConnectionStore);
		pushStore.addEventListener.mockReturnValue(() => {});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('does not pass suggestions to its composer', () => {
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

	it('overrides the pinned compact artifacts sidebar when the available thread width is narrow', async () => {
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
		layoutMockState.instanceAiSidebarCollapsed!.value = true;
		layoutMockState.threadAreaWidth!.value = 1200;
		layoutMockState.toggleSidebar!.mockImplementation(() => {
			layoutMockState.instanceAiSidebarCollapsed!.value =
				!layoutMockState.instanceAiSidebarCollapsed!.value;
			layoutMockState.threadAreaWidth!.value = layoutMockState.instanceAiSidebarCollapsed!.value
				? 1200
				: 820;
		});

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

		layoutMockState.threadAreaWidth!.value = 1200;
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

	it('reacts to thread area resizes when deciding if pinning is available', async () => {
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
		layoutMockState.threadAreaWidth!.value = 950;

		const { getByTestId, queryByTestId } = renderView({ props: { threadId: 'thread-1' } });

		expect(getByTestId('instance-ai-artifacts-sidebar-stub')).toHaveAttribute(
			'data-pinned',
			'true',
		);
		expect(getByTestId('instance-ai-artifacts-sidebar-stub')).toHaveAttribute(
			'data-pinning-available',
			'true',
		);

		layoutMockState.threadAreaWidth!.value = 820;
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

		layoutMockState.threadAreaWidth!.value = 950;
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

	it('reconnects on same-thread re-entry when SSE is disconnected', async () => {
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

		renderView({ props: { threadId: 'thread-1' } });

		await vi.waitFor(() => {
			expect(store.loadHistoricalMessages).toHaveBeenCalledWith('thread-1');
		});
		expect(store.loadThreadStatus).toHaveBeenCalledWith('thread-1');
		expect(store.connectSSE).toHaveBeenCalledWith('thread-1');
	});

	it('switches threads when navigating to a known but inactive thread', async () => {
		store.currentThreadId = 'thread-1';
		store.threads = [
			...store.threads,
			{
				id: 'thread-2',
				title: 'Another',
				createdAt: '2026-04-02T00:00:00.000Z',
				updatedAt: '2026-04-02T00:00:00.000Z',
			},
		] as typeof store.threads;

		renderView({ props: { threadId: 'thread-2' } });

		await vi.waitFor(() => {
			expect(store.switchThread).toHaveBeenCalledWith('thread-2');
		});
	});
});
