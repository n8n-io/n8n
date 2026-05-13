import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import InstanceAiThreadView from '../InstanceAiThreadView.vue';
import { useInstanceAiStore, type ThreadRuntime } from '../instanceAi.store';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { SidebarStateKey } from '../instanceAiLayout';

vi.mock('@/app/composables/usePageRedirectionHelper', () => ({
	usePageRedirectionHelper: () => ({ goToUpgrade: vi.fn() }),
}));

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
	useScroll: () => ({ arrivedState: { bottom: true } }),
	useWindowSize: () => ({ width: ref(1200) }),
}));

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

const renderView = createComponentRenderer(InstanceAiThreadView, {
	global: {
		provide: {
			[SidebarStateKey as symbol]: { collapsed: ref(false), toggle: vi.fn() },
		},
		stubs: {
			InstanceAiInput: InstanceAiInputStub,
		},
	},
});

describe('InstanceAiThreadView', () => {
	let store: ReturnType<typeof mockedStore<typeof useInstanceAiStore>>;
	let thread: ThreadRuntime;

	beforeEach(() => {
		// Default `stubActions: true` — every store action becomes a no-op spy.
		const pinia = createTestingPinia();
		setActivePinia(pinia);

		thread = {
			id: 'thread-1',
			messages: [],
			sseState: 'connected',
			isStreaming: false,
			isSendingMessage: false,
			isAwaitingConfirmation: false,
			amendContext: null,
			contextualSuggestion: null,
			currentTasks: null,
			producedArtifacts: new Map(),
			resourceNameIndex: new Map(),
			feedbackByResponseId: {},
			rateableResponseId: null,
			pendingConfirmations: [],
			debugEvents: [],
			loadHistoricalMessages: vi.fn().mockResolvedValue('applied'),
			loadThreadStatus: vi.fn().mockResolvedValue(undefined),
			connectSSE: vi.fn(),
			closeSSE: vi.fn(),
			sendMessage: vi.fn().mockResolvedValue(undefined),
			cancelRun: vi.fn().mockResolvedValue(undefined),
			copyFullTrace: vi.fn(),
			submitFeedback: vi.fn(),
		} as unknown as ThreadRuntime;

		store = mockedStore(useInstanceAiStore);
		store.getOrCreateRuntime.mockReturnValue(thread);
		store.threads = [
			{
				id: 'thread-1',
				title: 'Test thread',
				createdAt: '2026-04-01T00:00:00.000Z',
				updatedAt: '2026-04-01T00:00:00.000Z',
			},
		] as typeof store.threads;

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

	it('reconnects on same-thread re-entry when SSE is disconnected', async () => {
		thread.sseState = 'disconnected';
		thread.messages = [
			{
				id: 'msg-history',
				role: 'assistant',
				content: 'already loaded',
				reasoning: '',
				isStreaming: false,
				createdAt: '2026-04-01T00:00:00.000Z',
			},
		];
		vi.mocked(thread.loadHistoricalMessages).mockResolvedValue('skipped');

		renderView({ props: { threadId: 'thread-1' } });

		await vi.waitFor(() => {
			expect(thread.loadHistoricalMessages).toHaveBeenCalledWith();
		});
		expect(thread.loadThreadStatus).toHaveBeenCalledWith();
		expect(thread.connectSSE).toHaveBeenCalledWith();
	});

	it('connects the route thread when navigating to a known thread', async () => {
		thread.sseState = 'disconnected';
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
			expect(store.getOrCreateRuntime).toHaveBeenCalledWith('thread-2');
		});
		expect(thread.loadHistoricalMessages).toHaveBeenCalledWith();
	});
});
