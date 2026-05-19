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
import type { InstanceAiAgentNode, InstanceAiMessage } from '@n8n/api-types';

vi.mock('@/app/composables/usePageRedirectionHelper', () => ({
	usePageRedirectionHelper: () => ({ goToUpgrade: vi.fn() }),
}));

vi.mock('@n8n/stores', () => ({
	STORES: new Proxy(
		{},
		{
			get: (_, property) => String(property),
		},
	),
}));

vi.mock('@/features/ndv/shared/ndv.store', () => ({
	getNDVStoreId: () => 'ndv',
	injectNDVStore: () => ({}),
	useNDVStore: () => ({}),
}));

vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore: () => ({
		isCloudDeployment: false,
		isModuleActive: vi.fn(),
		moduleSettings: {},
	}),
}));

vi.mock('../components/AgentSection.vue', () => ({
	default: {
		name: 'AgentSectionStub',
		props: ['agentNode'],
		template: '<div data-test-id="agent-section-stub" />',
	},
}));

vi.mock('../components/InstanceAiWorkflowPreview.vue', () => ({
	default: {
		name: 'InstanceAiWorkflowPreviewStub',
		props: ['workflowId', 'refreshKey'],
		template: '<div data-test-id="workflow-preview-stub" />',
	},
}));

vi.mock('../components/InstanceAiDataTablePreview.vue', () => ({
	default: {
		name: 'InstanceAiDataTablePreviewStub',
		props: ['dataTableId', 'projectId', 'refreshKey'],
		template: '<div data-test-id="data-table-preview-stub" />',
	},
}));

vi.mock('../components/InstanceAiArtifactsPanel.vue', () => ({
	default: {
		name: 'InstanceAiArtifactsPanelStub',
		template: '<div data-test-id="artifacts-panel-stub" />',
	},
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

const inputFocusSpy = vi.fn();

const InstanceAiInputStub = defineComponent({
	name: 'InstanceAiInputStub',
	props: {
		suggestions: { type: Array, required: false },
		isStreaming: { type: Boolean, required: false },
		isPlanEditMode: { type: Boolean, required: false },
	},
	emits: ['submit', 'cancel-plan-edit'],
	setup(props, { emit, expose }) {
		expose({ focus: inputFocusSpy });
		return () =>
			h('div', { 'data-test-id': 'instance-ai-input-stub' }, [
				props.suggestions === undefined ? 'unset' : String(props.suggestions.length),
				h(
					'span',
					{ 'data-test-id': 'instance-ai-input-mode' },
					props.isPlanEditMode ? 'plan-edit' : 'normal',
				),
				h(
					'button',
					{
						'data-test-id': 'instance-ai-input-submit',
						onClick: () =>
							emit(
								'submit',
								props.isPlanEditMode ? 'Make the plan simpler' : 'Normal message',
								undefined,
							),
					},
					'Submit',
				),
				props.isPlanEditMode
					? h(
							'button',
							{
								'data-test-id': 'instance-ai-input-cancel-plan-edit',
								onClick: () => emit('cancel-plan-edit'),
							},
							'Cancel',
						)
					: null,
			]);
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

function makePlanReviewMessage(): InstanceAiMessage {
	const planner: InstanceAiAgentNode = {
		agentId: 'planner-1',
		role: 'planner',
		status: 'completed',
		textContent: '',
		reasoning: '',
		toolCalls: [
			{
				toolCallId: 'tc-plan',
				toolName: 'submit-plan',
				args: {},
				isLoading: true,
				confirmationStatus: 'pending',
				confirmation: {
					requestId: 'req-plan',
					inputThreadId: 'input-thread-1',
					severity: 'info',
					message: 'Review the plan',
					inputType: 'plan-review',
					planItems: [
						{
							id: 'workflow',
							title: "Build 'Lead routing' workflow",
							kind: 'build-workflow',
							spec: 'Route qualified leads to sales.',
							deps: [],
						},
					],
				},
			},
		],
		children: [],
		timeline: [],
	};

	return {
		id: 'msg-plan',
		role: 'assistant',
		content: '',
		reasoning: '',
		isStreaming: true,
		createdAt: '2026-04-01T00:00:00.000Z',
		agentTree: {
			agentId: 'root',
			role: 'orchestrator',
			status: 'active',
			textContent: '',
			reasoning: '',
			toolCalls: [],
			children: [planner],
			timeline: [{ type: 'child', agentId: 'planner-1' }],
		},
	};
}

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
			resolvedConfirmationIds: new Map(),
			debugEvents: [],
			loadHistoricalMessages: vi.fn().mockResolvedValue('applied'),
			loadThreadStatus: vi.fn().mockResolvedValue(undefined),
			connectSSE: vi.fn(),
			closeSSE: vi.fn(),
			sendMessage: vi.fn().mockResolvedValue(undefined),
			cancelRun: vi.fn().mockResolvedValue(undefined),
			resolveConfirmation: vi.fn(),
			confirmAction: vi.fn().mockResolvedValue(true),
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
		inputFocusSpy.mockClear();
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

	it('focuses the main composer when asking for plan edits', async () => {
		thread.messages = [makePlanReviewMessage()];

		const { getByTestId } = renderView({ props: { threadId: 'thread-1' } });

		await vi.waitFor(() => {
			expect(getByTestId('instance-ai-plan-request-changes')).toBeInTheDocument();
		});

		await getByTestId('instance-ai-plan-request-changes').click();

		await vi.waitFor(() => {
			expect(inputFocusSpy).toHaveBeenCalled();
			expect(getByTestId('instance-ai-input-mode')).toHaveTextContent('plan-edit');
		});
	});

	it('submits plan edit feedback through confirmation instead of a new chat message', async () => {
		thread.messages = [makePlanReviewMessage()];

		const { getByTestId } = renderView({ props: { threadId: 'thread-1' } });

		await vi.waitFor(() => {
			expect(getByTestId('instance-ai-plan-request-changes')).toBeInTheDocument();
		});
		await getByTestId('instance-ai-plan-request-changes').click();
		await getByTestId('instance-ai-input-submit').click();

		expect(thread.resolveConfirmation).toHaveBeenCalledWith('req-plan', 'denied');
		expect(thread.confirmAction).toHaveBeenCalledWith('req-plan', {
			kind: 'approval',
			approved: false,
			userInput: 'Make the plan simpler',
		});
		expect(thread.sendMessage).not.toHaveBeenCalled();
	});

	it('keeps normal composer submissions as chat messages', async () => {
		const { getByTestId } = renderView({ props: { threadId: 'thread-1' } });

		await getByTestId('instance-ai-input-submit').click();

		expect(thread.sendMessage).toHaveBeenCalledWith(
			'Normal message',
			undefined,
			expect.any(String),
		);
		expect(thread.confirmAction).not.toHaveBeenCalled();
	});
});
