import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, reactive, ref, type PropType } from 'vue';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import InstanceAiThreadView from '../InstanceAiThreadView.vue';
import { useInstanceAiStore, type ThreadRuntime } from '../instanceAi.store';
import type { PlanEditContext } from '../instanceAi.threadRuntime';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { SidebarStateKey } from '../instanceAiLayout';
import { NEW_CONVERSATION_TITLE } from '../constants';
import type { WorkflowFailuresReport } from '../components/InstanceAiWorkflowPreview.vue';
import type {
	FrontendModuleSettings,
	InstanceAiAgentNode,
	InstanceAiMessage,
} from '@n8n/api-types';
import {
	getPendingAgentAttachment,
	stashPendingAgentAttachment,
} from '../composables/useInstanceAiHandoff';
import { useAgentEvalsStore } from '@/features/agents/agentEvals.store';

const mockWindowSizeState = vi.hoisted(() => ({
	width: { value: 1200 },
}));

const mockThreadAreaSizeState = vi.hoisted(() => ({
	width: { value: 1600 },
}));

const planEditSubmitState = vi.hoisted(() => ({
	message: 'Make the plan simpler',
}));

const telemetryTrackSpy = vi.hoisted(() => vi.fn());
const routerPushSpy = vi.hoisted(() => vi.fn());
const localStorageState = vi.hoisted(() => ({
	store: new Map<string, string>(),
}));

Object.defineProperty(globalThis, 'localStorage', {
	configurable: true,
	value: {
		getItem: vi.fn((key: string) => localStorageState.store.get(key) ?? null),
		setItem: vi.fn((key: string, value: string) => {
			localStorageState.store.set(key, value);
		}),
		removeItem: vi.fn((key: string) => {
			localStorageState.store.delete(key);
		}),
		clear: vi.fn(() => {
			localStorageState.store.clear();
		}),
	},
});

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: telemetryTrackSpy }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn(), showMessage: vi.fn() }),
}));

vi.mock('@/app/composables/usePageRedirectionHelper', () => ({
	usePageRedirectionHelper: () => ({ goToUpgrade: vi.fn() }),
}));

const testAgentOfferState = vi.hoisted(() => ({
	evalsFlagEnabled: false,
	capabilitySummary: null as unknown,
}));

vi.mock('@/features/ai/evaluation.ee/composables/useAgentEvalsFlag', () => ({
	useAgentEvalsFlag: () => ({
		get value() {
			return testAgentOfferState.evalsFlagEnabled;
		},
	}),
}));

vi.mock('@/features/agents/composables/useAgentCapabilitySummary', () => ({
	useAgentCapabilitySummary: () => ({
		summary: {
			get value() {
				return testAgentOfferState.capabilitySummary;
			},
		},
		isLoading: { value: false },
		error: { value: null },
		fetch: vi.fn(),
	}),
}));

const mockRouteState = vi.hoisted(() => ({
	params: { threadId: 'thread-1' } as { threadId?: string },
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRoute: () => ({
		params: mockRouteState.params,
		path: '/instance-ai/thread-1',
		matched: [],
		fullPath: '/instance-ai/thread-1',
		query: {},
		hash: '',
		meta: {},
	}),
	useRouter: () => ({
		push: routerPushSpy,
		replace: vi.fn(),
		currentRoute: {
			get value() {
				return { params: mockRouteState.params };
			},
		},
	}),
}));

vi.mock('@vueuse/core', async (importOriginal) => ({
	...(await importOriginal()),
	useScroll: () => ({ arrivedState: { bottom: true } }),
	useWindowSize: () => ({ width: mockWindowSizeState.width }),
	useElementSize: () => ({ width: mockThreadAreaSizeState.width }),
}));

const inputFocusSpy = vi.fn();
const mockSidebarCollapsed = ref(false);

const InstanceAiInputStub = defineComponent({
	name: 'InstanceAiInputStub',
	props: {
		suggestions: { type: Array, required: false },
		isStreaming: { type: Boolean, required: false },
		isPlanEditMode: { type: Boolean, required: false },
		isWorkflowBuilderAvailable: { type: Boolean, required: false },
		contextChip: { type: Object, required: false },
	},
	emits: ['submit', 'cancel-plan-edit', 'dismiss-context-chip'],
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
					'span',
					{ 'data-test-id': 'instance-ai-input-availability' },
					props.isWorkflowBuilderAvailable === false ? 'unavailable' : 'available',
				),
				h(
					'span',
					{ 'data-test-id': 'instance-ai-input-context-chip' },
					props.contextChip?.label ?? '',
				),
				h(
					'span',
					{ 'data-test-id': 'instance-ai-input-context-chip-icon' },
					props.contextChip?.icon ?? '',
				),
				h(
					'button',
					{
						'data-test-id': 'instance-ai-input-submit',
						onClick: () =>
							emit(
								'submit',
								props.isPlanEditMode ? planEditSubmitState.message : 'Normal message',
								undefined,
							),
					},
					'Submit',
				),
				props.contextChip
					? h(
							'button',
							{
								'data-test-id': 'instance-ai-input-dismiss-context-chip',
								onClick: () => emit('dismiss-context-chip'),
							},
							'Dismiss context',
						)
					: null,
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

let workflowPreviewEmit:
	| ((event: 'workflow-failures', payload: WorkflowFailuresReport) => void)
	| null = null;

const InstanceAiWorkflowPreviewStub = defineComponent({
	name: 'InstanceAiWorkflowPreviewStub',
	emits: ['workflow-failures'],
	setup(_, { emit, expose }) {
		workflowPreviewEmit = emit as typeof workflowPreviewEmit;
		expose({ requestFitView: vi.fn() });
		return () => h('div', { 'data-test-id': 'instance-ai-workflow-preview-stub' });
	},
});

const InstanceAiAgentPreviewStub = defineComponent({
	name: 'InstanceAiAgentPreviewStub',
	props: {
		agentId: { type: String, required: true },
		projectId: { type: String, required: true },
	},
	emits: ['preview-open-change'],
	setup(props, { emit }) {
		return () =>
			h(
				'div',
				{
					'data-test-id': 'instance-ai-agent-preview-stub',
					'data-agent-id': props.agentId,
					'data-project-id': props.projectId,
				},
				[
					h(
						'button',
						{
							'data-test-id': 'instance-ai-agent-preview-open-dock',
							onClick: () => emit('preview-open-change', true),
						},
						'Open preview dock',
					),
					h(
						'button',
						{
							'data-test-id': 'instance-ai-agent-preview-close-dock',
							onClick: () => emit('preview-open-change', false),
						},
						'Close preview dock',
					),
				],
			);
	},
});

const InstanceAiConfirmationPanelStub = defineComponent({
	name: 'InstanceAiConfirmationPanelStub',
	props: {
		kind: { type: String, required: true },
	},
	setup(props) {
		return () => h('div', { 'data-test-id': `instance-ai-confirmation-panel-${props.kind}` });
	},
});

const AgentSectionStub = defineComponent({
	name: 'AgentSectionStub',
	props: {
		agentNode: { type: Object as PropType<InstanceAiAgentNode>, required: true },
	},
	setup(props) {
		return () =>
			h(
				'div',
				{
					'data-test-id': 'agent-section-stub',
					'data-agent-id': props.agentNode.agentId,
				},
				props.agentNode.title ?? props.agentNode.role,
			);
	},
});

const renderView = createComponentRenderer(InstanceAiThreadView, {
	global: {
		provide: {
			[SidebarStateKey as symbol]: { collapsed: mockSidebarCollapsed, toggle: vi.fn() },
		},
		stubs: {
			InstanceAiInput: InstanceAiInputStub,
			InstanceAiWorkflowPreview: InstanceAiWorkflowPreviewStub,
			InstanceAiAgentPreview: InstanceAiAgentPreviewStub,
			InstanceAiConfirmationPanel: InstanceAiConfirmationPanelStub,
			AgentSection: AgentSectionStub,
			InstanceAiDataTablePreview: { template: '<div data-test-id="data-table-preview-stub" />' },
			InstanceAiArtifactsPanel: { template: '<div data-test-id="artifacts-panel-stub" />' },
		},
	},
});

const defaultModuleSettings: NonNullable<FrontendModuleSettings['instance-ai']> = {
	enabled: true,
	localGatewayDisabled: false,
	browserUseEnabled: true,
	proxyEnabled: false,
	cloudManaged: false,
	sandboxEnabled: true,
	workflowBuilderAvailable: true,
	sandboxUnavailableReason: null,
	runDebugEnabled: false,
};

function makePlanReviewMessage(): InstanceAiMessage {
	const orchestrator: InstanceAiAgentNode = {
		agentId: 'root',
		role: 'orchestrator',
		status: 'completed',
		textContent: '',
		reasoning: '',
		toolCalls: [
			{
				toolCallId: 'tc-plan',
				toolName: 'create-tasks',
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
		timeline: [{ type: 'tool-call', toolCallId: 'tc-plan' }],
	};

	return {
		id: 'msg-plan',
		role: 'assistant',
		content: '',
		reasoning: '',
		isStreaming: true,
		createdAt: '2026-04-01T00:00:00.000Z',
		agentTree: {
			...orchestrator,
			status: 'active',
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

		useSettingsStore().moduleSettings = {
			'instance-ai': { ...defaultModuleSettings },
		};
		workflowPreviewEmit = null;

		thread = reactive({
			id: 'thread-1',
			messages: [],
			hasMessages: false,
			sseState: 'connected',
			isStreaming: false,
			isSendingMessage: false,
			isAwaitingConfirmation: false,
			isHydratingThread: false,
			amendContext: null,
			activePlanEdit: null,
			updatingPlanRequestIds: new Set<string>(),
			contextualSuggestion: null,
			currentTasks: null,
			producedArtifacts: new Map(),
			resourceNameIndex: new Map(),
			linkableResourceNameIndex: new Map(),
			feedbackByResponseId: {},
			rateableResponseId: null,
			pendingConfirmations: [],
			resolvedConfirmationIds: new Map(),
			debugEvents: [],
			loadHistoricalMessages: vi.fn().mockResolvedValue('applied'),
			loadThreadStatus: vi.fn().mockResolvedValue(undefined),
			connectSSE: vi.fn(),
			closeSSE: vi.fn(),
			sendMessage: vi.fn().mockResolvedValue(true),
			cancelRun: vi.fn().mockResolvedValue(undefined),
			resolveConfirmation: vi.fn(),
			confirmAction: vi.fn().mockResolvedValue(true),
			markPlanUpdatePending: vi.fn(),
			clearPlanUpdatePending: vi.fn(),
			copyFullTrace: vi.fn(),
			submitFeedback: vi.fn(),
		}) as unknown as ThreadRuntime;
		// startPlanEdit / cancelPlanEdit need to mutate the thread so the
		// chat-input submission path can read activePlanEdit back out.
		thread.startPlanEdit = vi.fn((context: PlanEditContext) => {
			thread.activePlanEdit = context;
		});
		thread.cancelPlanEdit = vi.fn(() => {
			thread.activePlanEdit = null;
		});

		store = mockedStore(useInstanceAiStore);
		store.getOrCreateRuntime.mockReturnValue(thread);
		store.getRuntime.mockReturnValue(thread);
		store.threads = [
			{
				id: 'thread-1',
				title: 'Test thread',
				createdAt: '2026-04-01T00:00:00.000Z',
				updatedAt: '2026-04-01T00:00:00.000Z',
			},
		] as typeof store.threads;
		store.getThreadMetadata.mockImplementation(
			(threadId) => store.threads.find((item) => item.id === threadId)?.metadata ?? undefined,
		);
		mockWindowSizeState.width.value = 1200;
		mockThreadAreaSizeState.width.value = 1600;

		// Auto-stubbed push-store actions return undefined by default; addEventListener's
		// caller expects a removeListener function, so return a no-op.
		const pushStore = mockedStore(usePushConnectionStore);
		pushStore.addEventListener.mockReturnValue(() => {});
		inputFocusSpy.mockClear();
		telemetryTrackSpy.mockClear();
		routerPushSpy.mockClear();
		planEditSubmitState.message = 'Make the plan simpler';
		mockRouteState.params = { threadId: 'thread-1' };
		localStorageState.store.clear();
		mockSidebarCollapsed.value = false;
		testAgentOfferState.evalsFlagEnabled = false;
		testAgentOfferState.capabilitySummary = null;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	async function renderAgentArtifact({
		threadAreaWidth = 1600,
		includeWorkflow = false,
	}: { threadAreaWidth?: number; includeWorkflow?: boolean } = {}) {
		mockThreadAreaSizeState.width.value = threadAreaWidth;
		thread.producedArtifacts = new Map([
			['agent-1', { type: 'agent', id: 'agent-1', projectId: 'proj-1', name: 'SEO Auditor' }],
		]) as typeof thread.producedArtifacts;
		if (includeWorkflow) {
			thread.producedArtifacts.set('workflow-1', {
				type: 'workflow',
				id: 'workflow-1',
				name: 'SEO Workflow',
			});
		}
		thread.messages = [
			{
				id: 'msg-agent',
				role: 'user',
				content: 'Update this agent',
				isStreaming: false,
				createdAt: '2026-04-01T00:00:00.000Z',
				attachments: [
					{
						type: 'agent',
						id: 'agent-1',
						projectId: 'proj-1',
						name: 'SEO Auditor',
					},
				],
			},
		] as typeof thread.messages;

		const user = userEvent.setup();
		const rendered = renderView({ props: { threadId: 'thread-1' } });
		await rendered.findByTestId('instance-ai-agent-preview-stub');

		return { ...rendered, user };
	}

	it('does not pass suggestions to its composer', () => {
		const { getByTestId } = renderView({ props: { threadId: 'thread-1' } });
		expect(getByTestId('instance-ai-input-stub')).toHaveTextContent('unset');
	});

	describe('browser tab title', () => {
		it('names the tab after the thread it opens', () => {
			renderView({ props: { threadId: 'thread-1' } });
			expect(document.title).toBe('Test thread - n8n');
		});

		it('falls back to the feature title for a thread without a title', () => {
			store.threads = [
				{ ...store.threads[0], title: NEW_CONVERSATION_TITLE },
			] as typeof store.threads;

			renderView({ props: { threadId: 'thread-1' } });

			expect(document.title).toBe('AI Assistant - n8n');
		});

		it('renames the tab when the thread gets a title', async () => {
			renderView({ props: { threadId: 'thread-1' } });

			store.threads = [{ ...store.threads[0], title: 'Renamed thread' }] as typeof store.threads;

			await vi.waitFor(() => {
				expect(document.title).toBe('Renamed thread - n8n');
			});
		});
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

		const callOrder: string[] = [];
		vi.mocked(thread.loadThreadStatus).mockImplementation(async () => {
			callOrder.push('loadThreadStatus');
		});
		vi.mocked(thread.connectSSE).mockImplementation(() => {
			callOrder.push('connectSSE');
		});

		renderView({ props: { threadId: 'thread-1' } });

		await vi.waitFor(() => {
			expect(thread.loadHistoricalMessages).toHaveBeenCalledWith();
		});
		await vi.waitFor(() => {
			expect(callOrder).toEqual(['loadThreadStatus', 'connectSSE']);
		});
	});

	it('does not reconnect SSE when the runtime was replaced during status load', async () => {
		thread.sseState = 'disconnected';
		vi.mocked(thread.loadHistoricalMessages).mockResolvedValue('skipped');
		vi.mocked(thread.loadThreadStatus).mockImplementation(async () => {
			store.getRuntime.mockReturnValue({ id: 'thread-1' } as ThreadRuntime);
		});

		renderView({ props: { threadId: 'thread-1' } });

		await vi.waitFor(() => {
			expect(thread.loadThreadStatus).toHaveBeenCalledWith();
		});
		await vi.waitFor(() => {
			expect(thread.connectSSE).not.toHaveBeenCalled();
		});
	});

	it('shows a pending preview-context chip and attaches it on the first submit', async () => {
		thread.sseState = 'disconnected';
		vi.mocked(thread.loadHistoricalMessages).mockResolvedValue('skipped');
		localStorageState.store.set(
			'n8n-instance-ai-handoff-context:thread-1',
			JSON.stringify({
				source: 'agent-preview',
				agentId: 'agent-1',
				threadId: 'preview-thread-1',
			}),
		);
		thread.producedArtifacts = new Map([
			[
				'agent-1',
				{
					type: 'agent',
					id: 'agent-1',
					projectId: 'proj-1',
					name: 'SEO Auditor',
				},
			],
		]) as typeof thread.producedArtifacts;

		const { getByTestId } = renderView({ props: { threadId: 'thread-1' } });

		await vi.waitFor(() => {
			expect(getByTestId('instance-ai-input-context-chip')).toHaveTextContent(
				'SEO Auditor session',
			);
		});

		await userEvent.click(getByTestId('instance-ai-input-submit'));

		expect(thread.sendMessage).toHaveBeenCalledWith(
			'Normal message',
			undefined,
			expect.any(String),
			{
				source: 'agent-preview',
				agentId: 'agent-1',
				threadId: 'preview-thread-1',
			},
		);
		await vi.waitFor(() => {
			expect(getByTestId('instance-ai-input-context-chip')).toHaveTextContent('');
		});
	});

	it('applies pending preview context before message hydration finishes', async () => {
		thread.sseState = 'disconnected';
		let resolveHydration!: (status: 'skipped') => void;
		vi.mocked(thread.loadHistoricalMessages).mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveHydration = resolve;
				}),
		);
		localStorageState.store.set(
			'n8n-instance-ai-handoff-context:thread-1',
			JSON.stringify({
				source: 'agent-preview',
				agentId: 'agent-1',
				threadId: 'preview-thread-1',
			}),
		);
		thread.producedArtifacts = new Map([
			[
				'agent-1',
				{
					type: 'agent',
					id: 'agent-1',
					projectId: 'proj-1',
					name: 'SEO Auditor',
				},
			],
		]) as typeof thread.producedArtifacts;

		const { getByTestId } = renderView({ props: { threadId: 'thread-1' } });

		await vi.waitFor(() => {
			expect(getByTestId('instance-ai-input-context-chip')).toHaveTextContent(
				'SEO Auditor session',
			);
		});
		expect(thread.loadThreadStatus).not.toHaveBeenCalled();
		expect(localStorageState.store.has('n8n-instance-ai-handoff-context:thread-1')).toBe(false);

		await userEvent.click(getByTestId('instance-ai-input-submit'));

		expect(thread.sendMessage).toHaveBeenCalledWith(
			'Normal message',
			undefined,
			expect.any(String),
			{
				source: 'agent-preview',
				agentId: 'agent-1',
				threadId: 'preview-thread-1',
			},
		);

		resolveHydration('skipped');
		await vi.waitFor(() => {
			expect(thread.connectSSE).toHaveBeenCalled();
		});
	});

	it('keeps pending preview context after a failed send so retry can reattach it', async () => {
		thread.sseState = 'disconnected';
		vi.mocked(thread.loadHistoricalMessages).mockResolvedValue('skipped');
		vi.mocked(thread.sendMessage).mockResolvedValueOnce(false).mockResolvedValue(true);
		localStorageState.store.set(
			'n8n-instance-ai-handoff-context:thread-1',
			JSON.stringify({
				source: 'agent-preview',
				agentId: 'agent-1',
				threadId: 'preview-thread-1',
			}),
		);
		thread.producedArtifacts = new Map([
			[
				'agent-1',
				{
					type: 'agent',
					id: 'agent-1',
					projectId: 'proj-1',
					name: 'SEO Auditor',
				},
			],
		]) as typeof thread.producedArtifacts;

		const { getByTestId } = renderView({ props: { threadId: 'thread-1' } });

		await vi.waitFor(() => {
			expect(getByTestId('instance-ai-input-context-chip')).toHaveTextContent(
				'SEO Auditor session',
			);
		});

		await userEvent.click(getByTestId('instance-ai-input-submit'));

		expect(thread.sendMessage).toHaveBeenCalledWith(
			'Normal message',
			undefined,
			expect.any(String),
			{
				source: 'agent-preview',
				agentId: 'agent-1',
				threadId: 'preview-thread-1',
			},
		);
		await vi.waitFor(() => {
			expect(getByTestId('instance-ai-input-context-chip')).toHaveTextContent(
				'SEO Auditor session',
			);
		});

		await userEvent.click(getByTestId('instance-ai-input-submit'));

		expect(thread.sendMessage).toHaveBeenNthCalledWith(
			2,
			'Normal message',
			undefined,
			expect.any(String),
			{
				source: 'agent-preview',
				agentId: 'agent-1',
				threadId: 'preview-thread-1',
			},
		);
		await vi.waitFor(() => {
			expect(getByTestId('instance-ai-input-context-chip')).toHaveTextContent('');
		});
	});

	it('shows the new-agent context until the first successful message submission', async () => {
		thread.sseState = 'disconnected';
		vi.mocked(thread.loadHistoricalMessages).mockResolvedValue('skipped');
		store.threads = [
			{
				...store.threads[0],
				metadata: {
					instanceAiPendingAgentTarget: {
						agentId: 'agent-1',
						projectId: 'project-1',
					},
				},
			},
		] as typeof store.threads;
		thread.producedArtifacts = new Map([
			[
				'agent-1',
				{
					type: 'agent',
					id: 'agent-1',
					projectId: 'project-1',
					name: 'New Agent',
					pending: true,
				},
			],
		]) as typeof thread.producedArtifacts;
		stashPendingAgentAttachment('thread-1', {
			type: 'agent',
			id: 'agent-1',
			name: 'New Agent',
			projectId: 'project-1',
			pending: true,
		});
		vi.mocked(thread.sendMessage).mockResolvedValueOnce(false).mockResolvedValueOnce(true);

		const { findByTestId, getByTestId } = renderView({ props: { threadId: 'thread-1' } });

		const preview = await findByTestId('instance-ai-agent-preview-stub');
		expect(preview).toHaveAttribute('data-agent-id', 'agent-1');
		expect(preview).toHaveAttribute('data-project-id', 'project-1');
		expect(thread.sendMessage).not.toHaveBeenCalled();
		expect(getByTestId('instance-ai-input-context-chip')).toHaveTextContent('New Agent');

		await userEvent.click(getByTestId('instance-ai-input-submit'));

		expect(thread.sendMessage).toHaveBeenNthCalledWith(
			1,
			'Normal message',
			[
				{
					type: 'agent',
					id: 'agent-1',
					name: 'New Agent',
					projectId: 'project-1',
					pending: true,
				},
			],
			expect.any(String),
			undefined,
		);
		expect(getPendingAgentAttachment('thread-1')).not.toBeNull();
		expect(getByTestId('instance-ai-input-context-chip')).toHaveTextContent('New Agent');

		await userEvent.click(getByTestId('instance-ai-input-submit'));

		expect(thread.sendMessage).toHaveBeenNthCalledWith(
			2,
			'Normal message',
			[
				{
					type: 'agent',
					id: 'agent-1',
					name: 'New Agent',
					projectId: 'project-1',
					pending: true,
				},
			],
			expect.any(String),
			undefined,
		);
		await vi.waitFor(() => {
			expect(getPendingAgentAttachment('thread-1')).toBeNull();
			expect(getByTestId('instance-ai-input-context-chip')).toHaveTextContent('');
		});

		await userEvent.click(getByTestId('instance-ai-input-submit'));

		expect(thread.sendMessage).toHaveBeenNthCalledWith(
			3,
			'Normal message',
			undefined,
			expect.any(String),
			undefined,
		);
	});

	it('attaches the bound target when the new agent was persisted before the first message', async () => {
		thread.sseState = 'disconnected';
		vi.mocked(thread.loadHistoricalMessages).mockResolvedValue('skipped');
		store.threads = [
			{
				...store.threads[0],
				metadata: {
					instanceAiAgentBuilderTarget: {
						agentId: 'agent-1',
						projectId: 'project-1',
						name: 'Support Agent',
					},
				},
			},
		] as typeof store.threads;
		stashPendingAgentAttachment('thread-1', {
			type: 'agent',
			id: 'agent-1',
			name: 'New Agent',
			projectId: 'project-1',
			pending: true,
		});

		const { getByTestId } = renderView({ props: { threadId: 'thread-1' } });

		await vi.waitFor(() => {
			expect(getByTestId('instance-ai-input-context-chip')).toHaveTextContent('Support Agent');
		});
		await userEvent.click(getByTestId('instance-ai-input-submit'));

		expect(thread.sendMessage).toHaveBeenCalledWith(
			'Normal message',
			[
				{
					type: 'agent',
					id: 'agent-1',
					name: 'Support Agent',
					projectId: 'project-1',
				},
			],
			expect.any(String),
			undefined,
		);
	});

	it('detaches dismissed new-agent context without closing its preview', async () => {
		thread.sseState = 'disconnected';
		vi.mocked(thread.loadHistoricalMessages).mockResolvedValue('skipped');
		thread.producedArtifacts = new Map([
			[
				'agent-1',
				{
					type: 'agent',
					id: 'agent-1',
					projectId: 'project-1',
					name: 'New Agent',
					pending: true,
				},
			],
		]) as typeof thread.producedArtifacts;
		stashPendingAgentAttachment('thread-1', {
			type: 'agent',
			id: 'agent-1',
			name: 'New Agent',
			projectId: 'project-1',
			pending: true,
		});

		const { findByTestId, getByTestId } = renderView({ props: { threadId: 'thread-1' } });
		const preview = await findByTestId('instance-ai-agent-preview-stub');

		await userEvent.click(getByTestId('instance-ai-input-dismiss-context-chip'));

		expect(getPendingAgentAttachment('thread-1')).toBeNull();
		expect(getByTestId('instance-ai-input-context-chip')).toHaveTextContent('');
		expect(preview).toBeInTheDocument();
		await userEvent.click(getByTestId('instance-ai-input-submit'));
		expect(thread.sendMessage).toHaveBeenCalledWith(
			'Normal message',
			undefined,
			expect.any(String),
			undefined,
		);
	});

	it('dismisses a pending preview-context chip without sending it', async () => {
		thread.sseState = 'disconnected';
		vi.mocked(thread.loadHistoricalMessages).mockResolvedValue('skipped');
		localStorageState.store.set(
			'n8n-instance-ai-handoff-context:thread-1',
			JSON.stringify({
				source: 'agent-preview',
				agentId: 'agent-1',
				threadId: 'preview-thread-1',
			}),
		);

		const { getByTestId } = renderView({ props: { threadId: 'thread-1' } });

		await vi.waitFor(() => {
			expect(getByTestId('instance-ai-input-context-chip')).toHaveTextContent('Preview session');
		});

		await userEvent.click(getByTestId('instance-ai-input-dismiss-context-chip'));
		await vi.waitFor(() => {
			expect(getByTestId('instance-ai-input-context-chip')).toHaveTextContent('');
		});

		await userEvent.click(getByTestId('instance-ai-input-submit'));

		expect(thread.sendMessage).toHaveBeenCalledWith(
			'Normal message',
			undefined,
			expect.any(String),
			undefined,
		);
	});

	it('shows a sent preview-context chip and dismisses it through thread metadata', async () => {
		thread.messages = [
			{
				role: 'user',
				context: {
					source: 'agent-preview',
					agentId: 'agent-1',
					threadId: 'preview-thread-1',
				},
			},
		] as typeof thread.messages;
		thread.producedArtifacts = new Map([
			[
				'agent-1',
				{
					type: 'agent',
					id: 'agent-1',
					projectId: 'proj-1',
					name: 'SEO Auditor',
				},
			],
		]) as typeof thread.producedArtifacts;
		store.getThreadMetadata.mockReturnValue(undefined);

		const { getByTestId } = renderView({ props: { threadId: 'thread-1' } });

		expect(getByTestId('instance-ai-input-context-chip')).toHaveTextContent('SEO Auditor session');

		await userEvent.click(getByTestId('instance-ai-input-dismiss-context-chip'));

		expect(store.updateThreadMetadata).toHaveBeenCalledWith('thread-1', {
			dismissedContextKeys: ['agent-preview:agent-1:preview-thread-1:'],
		});
	});

	it('labels the preview-context chip with agent name + session title when carried', () => {
		thread.messages = [
			{
				role: 'user',
				context: {
					source: 'agent-preview',
					agentId: 'agent-1',
					threadId: 'preview-thread-1',
					agentName: 'SEO Auditor',
					agentIcon: 'megaphone',
					sessionTitle: 'Help with tone',
				},
			},
		] as typeof thread.messages;
		store.getThreadMetadata.mockReturnValue(undefined);

		const { getByTestId } = renderView({ props: { threadId: 'thread-1' } });

		expect(getByTestId('instance-ai-input-context-chip')).toHaveTextContent(
			'SEO Auditor — Help with tone',
		);
		expect(getByTestId('instance-ai-input-context-chip-icon')).toHaveTextContent('megaphone');
	});

	it('keeps the chat input visible when no floating-eligible confirmation is pending', () => {
		const { getByTestId, queryByTestId } = renderView({ props: { threadId: 'thread-1' } });

		expect(getByTestId('instance-ai-input-stub')).toBeTruthy();
		expect(queryByTestId('instance-ai-confirmation-panel-floating')).toBeNull();
		// Inline mount is always present so non-floating forms can render.
		expect(getByTestId('instance-ai-confirmation-panel-inline')).toBeTruthy();
	});

	it('shows an upfront unavailable state and blocks sends when the builder is unavailable', async () => {
		useSettingsStore().moduleSettings = {
			'instance-ai': {
				...defaultModuleSettings,
				sandboxEnabled: false,
				workflowBuilderAvailable: false,
			},
		};

		const { getByTestId, getByText } = renderView({ props: { threadId: 'thread-1' } });

		expect(getByTestId('instance-ai-workflow-builder-unavailable')).toBeVisible();
		expect(getByText('Workflow builder unavailable')).toBeVisible();
		expect(getByTestId('instance-ai-input-availability')).toHaveTextContent('unavailable');

		await userEvent.click(getByTestId('instance-ai-input-submit'));

		expect(thread.sendMessage).not.toHaveBeenCalled();
	});

	it('swaps the chat input for the floating panel when a generic approval is pending', () => {
		thread.pendingConfirmations = [
			{
				messageId: 'msg-floating',
				agentNode: { agentId: 'agent-1', role: 'orchestrator' },
				toolCall: {
					toolCallId: 'tc-1',
					toolName: 'workflows',
					args: { action: 'run' },
					isLoading: true,
					confirmationStatus: 'pending',
					confirmation: { requestId: 'req-1', severity: 'info', message: 'Run?' },
				},
			},
		] as unknown as ThreadRuntime['pendingConfirmations'];

		const { getByTestId, queryByTestId } = renderView({ props: { threadId: 'thread-1' } });

		expect(getByTestId('instance-ai-confirmation-panel-floating')).toBeTruthy();
		expect(queryByTestId('instance-ai-input-stub')).toBeNull();
	});

	it('keeps the chat input visible when only inline confirmations are pending', () => {
		thread.pendingConfirmations = [
			{
				messageId: 'msg-questions',
				agentNode: { agentId: 'agent-1', role: 'orchestrator' },
				toolCall: {
					toolCallId: 'tc-q',
					toolName: 'ask-user',
					args: {},
					isLoading: true,
					confirmationStatus: 'pending',
					confirmation: {
						requestId: 'req-q',
						severity: 'info',
						message: 'Pick',
						inputType: 'questions',
						questions: [{ id: 'q1', question: 'Pick?', type: 'single', options: ['a'] }],
					},
				},
			},
		] as unknown as ThreadRuntime['pendingConfirmations'];

		const { getByTestId, queryByTestId } = renderView({ props: { threadId: 'thread-1' } });

		expect(getByTestId('instance-ai-input-stub')).toBeTruthy();
		expect(queryByTestId('instance-ai-confirmation-panel-floating')).toBeNull();
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

	it('opens the artifacts panel from the header toggle when too narrow for pinned artifacts', async () => {
		mockWindowSizeState.width.value = 900;
		thread.messages = [
			{
				id: 'msg-1',
				role: 'assistant',
				content: 'already loaded',
				isStreaming: false,
				createdAt: '2026-04-01T00:00:00.000Z',
			},
		] as typeof thread.messages;
		Object.defineProperty(thread, 'hasMessages', { value: true, configurable: true });

		const user = userEvent.setup();
		const { getByTestId, queryByTestId } = renderView({ props: { threadId: 'thread-1' } });

		await vi.waitFor(() => {
			expect(getByTestId('instance-ai-artifacts-panel-toggle')).toBeInTheDocument();
		});
		expect(queryByTestId('instance-ai-artifacts-sidebar-edge')).not.toBeInTheDocument();
		expect(queryByTestId('instance-ai-artifacts-sidebar-slot')).not.toBeInTheDocument();

		await user.click(getByTestId('instance-ai-artifacts-panel-toggle'));

		expect(getByTestId('instance-ai-artifacts-sidebar-slot')).toBeInTheDocument();

		await user.click(getByTestId('instance-ai-content-area'));

		expect(queryByTestId('instance-ai-artifacts-sidebar-slot')).not.toBeInTheDocument();
	});

	it('keeps the artifacts panel toggle available when the panel is in the layout', async () => {
		mockWindowSizeState.width.value = 1700;
		thread.messages = [
			{
				id: 'msg-1',
				role: 'assistant',
				content: 'already loaded',
				isStreaming: false,
				createdAt: '2026-04-01T00:00:00.000Z',
			},
		] as typeof thread.messages;
		Object.defineProperty(thread, 'hasMessages', { value: true, configurable: true });

		const user = userEvent.setup();
		const { getByTestId, queryByTestId } = renderView({ props: { threadId: 'thread-1' } });

		await vi.waitFor(() => {
			expect(getByTestId('instance-ai-artifacts-panel-toggle')).toBeInTheDocument();
		});
		expect(getByTestId('instance-ai-artifacts-sidebar-slot')).toBeInTheDocument();

		await user.click(getByTestId('instance-ai-artifacts-panel-toggle'));

		expect(queryByTestId('instance-ai-artifacts-sidebar-slot')).not.toBeInTheDocument();

		await user.click(getByTestId('instance-ai-artifacts-panel-toggle'));

		expect(getByTestId('instance-ai-artifacts-sidebar-slot')).toBeInTheDocument();
	});

	it('renders the agent artifact preview when an agent is created', async () => {
		thread.producedArtifacts = new Map([
			['agent-1', { type: 'agent', id: 'agent-1', projectId: 'proj-1', name: 'SEO Auditor' }],
		]) as typeof thread.producedArtifacts;

		const { findByTestId } = renderView({ props: { threadId: 'thread-1' } });

		thread.messages.push({
			id: 'msg-agent',
			role: 'assistant',
			content: '',
			reasoning: '',
			isStreaming: false,
			createdAt: '2026-04-01T00:00:00.000Z',
			agentTree: {
				agentId: 'agent-builder',
				role: 'orchestrator',
				status: 'completed',
				textContent: '',
				reasoning: '',
				timeline: [],
				children: [
					{
						agentId: 'agent-builder-child',
						role: 'agent-builder',
						kind: 'agent-builder',
						status: 'completed',
						textContent: '',
						reasoning: '',
						timeline: [],
						children: [],
						toolCalls: [],
						targetResource: {
							type: 'agent',
							id: 'agent-1',
							projectId: 'proj-1',
							name: 'SEO Auditor',
						},
					},
				],
				toolCalls: [
					{
						toolCallId: 'tc-create-agent',
						toolName: 'build-agent',
						args: { message: 'build me an SEO auditor', name: 'SEO Auditor' },
						isLoading: false,
						result: { ok: true, builderReply: 'Created the agent.' },
					},
				],
			},
		} as never);

		const preview = await findByTestId('instance-ai-agent-preview-stub');

		expect(preview).toHaveAttribute('data-agent-id', 'agent-1');
		expect(preview).toHaveAttribute('data-project-id', 'proj-1');
	});

	it('preserves the artifact width while splitting the remaining width between both chats', async () => {
		const { getByTestId, queryByTestId, user } = await renderAgentArtifact({
			threadAreaWidth: 1200,
		});

		expect(queryByTestId('resize-handle')).toBeInTheDocument();
		const previewPanel = getByTestId('instance-ai-preview-panel');
		const threadArea = getByTestId('instance-ai-thread-area');
		const header = getByTestId('instance-ai-builder-chat-header');
		const content = getByTestId('instance-ai-content-area');
		expect(previewPanel.style.width).toBe('600px');
		expect(previewPanel.style.getPropertyValue('--agent-preview-chat-column-width')).toBe('300px');
		await vi.waitFor(() => {
			expect(previewPanel).toHaveClass('agentPreviewLayoutTransition');
		});

		await user.click(getByTestId('instance-ai-agent-preview-open-dock'));

		expect(threadArea).toHaveClass('agentPreviewDockOpen');
		expect(previewPanel.style.width).toBe('900px');
		expect(previewPanel.style.getPropertyValue('--agent-preview-chat-column-width')).toBe('300px');
		expect(queryByTestId('resize-handle')).not.toBeInTheDocument();

		await user.click(getByTestId('instance-ai-agent-preview-close-dock'));

		expect(threadArea).not.toHaveClass('agentPreviewDockOpen');
		expect(previewPanel.style.width).toBe('600px');
		expect(queryByTestId('resize-handle')).toBeInTheDocument();

		await fireEvent.mouseDown(getByTestId('resize-handle'), { clientX: 0 });

		expect(previewPanel).not.toHaveClass('agentPreviewLayoutTransition');
		await fireEvent.mouseMove(window, { clientX: 120 });
		expect(previewPanel.style.width).toBe('480px');
		expect(previewPanel.style.getPropertyValue('--agent-preview-chat-column-width')).toBe('360px');

		await fireEvent.mouseUp(window);

		await vi.waitFor(() => {
			expect(previewPanel).toHaveClass('agentPreviewLayoutTransition');
		});

		await user.click(getByTestId('instance-ai-agent-preview-open-dock'));

		expect(threadArea).toHaveClass('agentPreviewDockOpen');
		expect(header).not.toHaveAttribute('hidden');
		expect(header).not.toHaveAttribute('inert');
		expect(header).not.toHaveAttribute('aria-hidden');
		expect(content).not.toHaveAttribute('hidden');
		expect(content).not.toHaveAttribute('inert');
		expect(content).not.toHaveAttribute('aria-hidden');
		expect(previewPanel).toBeVisible();
		expect(previewPanel.style.width).toBe('840px');
		expect(previewPanel.style.getPropertyValue('--agent-preview-chat-column-width')).toBe('360px');
		expect(queryByTestId('resize-handle')).not.toBeInTheDocument();
		expect(routerPushSpy).not.toHaveBeenCalled();
	});

	it('restores and protects three-column layout when the dock opens from expanded preview', async () => {
		const { getByTestId, user } = await renderAgentArtifact();
		const previewPanel = getByTestId('instance-ai-preview-panel');
		const expandToggle = getByTestId('instance-ai-preview-expand-toggle');

		await user.click(expandToggle);
		expect(previewPanel).toHaveAttribute('data-expanded', 'true');

		await user.click(getByTestId('instance-ai-agent-preview-open-dock'));

		expect(previewPanel).toHaveAttribute('data-expanded', 'false');
		expect(expandToggle).toBeDisabled();
		expect(getByTestId('instance-ai-thread-area')).toHaveClass('agentPreviewDockOpen');

		await user.click(expandToggle);
		expect(previewPanel).toHaveAttribute('data-expanded', 'false');

		await user.click(getByTestId('instance-ai-agent-preview-close-dock'));
		expect(expandToggle).toBeEnabled();

		await user.click(expandToggle);
		expect(previewPanel).toHaveAttribute('data-expanded', 'true');
	});

	it('clears the agent dock layout when switching artifacts', async () => {
		const { container, getByTestId, user } = await renderAgentArtifact({
			includeWorkflow: true,
		});

		await user.click(getByTestId('instance-ai-agent-preview-open-dock'));
		expect(getByTestId('instance-ai-thread-area').className).toContain('agentPreviewDockOpen');

		const workflowTab = container.querySelector<HTMLElement>('[data-tab-id="workflow-1"]');
		expect(workflowTab).not.toBeNull();
		await user.click(workflowTab!);

		expect(getByTestId('instance-ai-thread-area').className).not.toContain('agentPreviewDockOpen');
	});

	it('clears the agent dock layout when switching threads', async () => {
		const { getByTestId, rerender, user } = await renderAgentArtifact();

		await user.click(getByTestId('instance-ai-agent-preview-open-dock'));
		expect(getByTestId('instance-ai-thread-area').className).toContain('agentPreviewDockOpen');

		await rerender({ threadId: 'thread-2' });

		expect(getByTestId('instance-ai-thread-area').className).not.toContain('agentPreviewDockOpen');
	});

	it('does not animate the agent dock layout during initial thread hydration', async () => {
		Reflect.set(thread, 'isHydratingThread', true);
		const { getByTestId, user } = await renderAgentArtifact({ threadAreaWidth: 1200 });
		await user.click(getByTestId('instance-ai-agent-preview-open-dock'));
		const builderChat = getByTestId('instance-ai-builder-chat');

		expect(builderChat).toHaveAttribute('data-layout-animated', 'false');
		expect(builderChat).not.toHaveClass('agentPreviewLayoutTransition');

		Reflect.set(thread, 'isHydratingThread', false);

		await vi.waitFor(() => {
			expect(builderChat).toHaveAttribute('data-layout-animated', 'true');
		});
		expect(builderChat).toHaveClass('agentPreviewLayoutTransition');
	});

	it('hoists an active builder section without leaving an empty assistant shell', async () => {
		const { findByTestId, queryByTestId } = renderView({ props: { threadId: 'thread-1' } });

		thread.messages.push({
			id: 'msg-active-builder',
			role: 'assistant',
			content: '',
			reasoning: '',
			isStreaming: false,
			createdAt: '2026-04-01T00:00:00.000Z',
			agentTree: {
				agentId: 'orchestrator-1',
				role: 'orchestrator',
				status: 'completed',
				textContent: '',
				reasoning: '',
				timeline: [
					{ type: 'tool-call', toolCallId: 'tc-build-agent', responseId: 'r1' },
					{ type: 'child', agentId: 'agent-builder-child', responseId: 'r1' },
				],
				children: [
					{
						agentId: 'agent-builder-child',
						role: 'agent-builder',
						kind: 'agent-builder',
						title: 'Building agent',
						status: 'active',
						textContent: '',
						reasoning: '',
						timeline: [],
						children: [],
						toolCalls: [],
						targetResource: {
							type: 'agent',
							id: 'agent-1',
							projectId: 'proj-1',
							name: 'SEO Auditor',
						},
					},
				],
				toolCalls: [
					{
						toolCallId: 'tc-build-agent',
						toolName: 'build-agent',
						args: { message: 'Build me an SEO auditor', name: 'SEO Auditor' },
						isLoading: true,
					},
				],
			},
		} as never);

		const builderSection = await findByTestId('agent-section-stub');

		expect(builderSection).toHaveAttribute('data-agent-id', 'agent-builder-child');
		expect(builderSection).toHaveTextContent('Building agent');
		expect(queryByTestId('instance-ai-assistant-message')).not.toBeInTheDocument();
	});

	it('closes the agent artifact preview from the wrapper toggle', async () => {
		const { getByTestId, queryByTestId, user } = await renderAgentArtifact();
		const previewPanel = getByTestId('instance-ai-preview-panel');
		expect(previewPanel).toBeVisible();

		await user.click(getByTestId('instance-ai-agent-preview-open-dock'));
		expect(getByTestId('instance-ai-thread-area')).toHaveClass('agentPreviewDockOpen');

		await user.click(getByTestId('instance-ai-artifacts-preview-toggle'));

		await vi.waitFor(() => {
			expect(previewPanel).not.toBeVisible();
		});
		expect(queryByTestId('instance-ai-agent-preview-stub')).not.toBeInTheDocument();
		expect(getByTestId('instance-ai-thread-area')).not.toHaveClass('agentPreviewDockOpen');
	});

	it('keeps the new-agent artifact accessible when closed and restores it after refresh', async () => {
		mockWindowSizeState.width.value = 1700;
		thread.producedArtifacts = new Map([
			[
				'agent-1',
				{
					type: 'agent',
					id: 'agent-1',
					projectId: 'proj-1',
					name: 'New Agent',
					pending: true,
				},
			],
		]) as typeof thread.producedArtifacts;

		const user = userEvent.setup();
		const firstRender = renderView({ props: { threadId: 'thread-1' } });

		await firstRender.findByTestId('instance-ai-agent-preview-stub');
		const previewPanel = await firstRender.findByTestId('instance-ai-preview-panel');
		expect(previewPanel).toBeVisible();

		await user.click(await firstRender.findByTestId('instance-ai-artifacts-preview-toggle'));

		await vi.waitFor(() => {
			expect(previewPanel).not.toBeVisible();
		});
		expect(firstRender.queryByTestId('instance-ai-agent-preview-stub')).not.toBeInTheDocument();
		expect(firstRender.getByTestId('instance-ai-artifacts-sidebar-slot')).toBeInTheDocument();
		expect(firstRender.getByTestId('instance-ai-artifacts-panel-toggle')).toBeInTheDocument();

		store.threads = [
			{
				...store.threads[0],
				metadata: {
					instanceAiAgentBuilderTarget: {
						agentId: 'agent-1',
						projectId: 'proj-1',
						name: 'Support Agent',
					},
				},
			},
		] as typeof store.threads;
		thread.producedArtifacts = new Map([
			[
				'agent-1',
				{
					type: 'agent',
					id: 'agent-1',
					projectId: 'proj-1',
					name: 'Support Agent',
				},
			],
		]) as typeof thread.producedArtifacts;

		firstRender.unmount();
		const refreshedRender = renderView({ props: { threadId: 'thread-1' } });
		const restoredPreview = await refreshedRender.findByTestId('instance-ai-agent-preview-stub');

		expect(restoredPreview).toHaveAttribute('data-agent-id', 'agent-1');
		expect(await refreshedRender.findByTestId('instance-ai-preview-panel')).toBeVisible();
	});

	describe('Fix with AI card', () => {
		const failureReport: WorkflowFailuresReport = {
			workflowId: 'wf-1',
			executionId: 'exec-1',
			errors: [{ nodeName: 'Extract Emails', errorMessage: 'Intentional break' }],
		};

		function seedThreadArtifact(workflowId = 'wf-1', workflowName = 'My Workflow') {
			thread.producedArtifacts = new Map([
				[workflowId, { type: 'workflow', id: workflowId, name: workflowName }],
			]) as typeof thread.producedArtifacts;
		}

		// Drives useCanvasPreview's auto-open watcher so the preview tab is
		// selected and the WorkflowPreview stub mounts (otherwise `v-if`
		// keeps it unrendered and `workflowPreviewEmit` is never captured).
		function openPreviewForBuild(workflowId = 'wf-1') {
			thread.messages.push({
				id: 'msg-build',
				role: 'assistant',
				content: '',
				reasoning: '',
				isStreaming: false,
				createdAt: '2026-04-01T00:00:00.000Z',
				agentTree: {
					agentId: 'agent-1',
					role: 'orchestrator',
					status: 'completed',
					textContent: '',
					reasoning: '',
					timeline: [],
					children: [],
					toolCalls: [
						{
							toolCallId: 'tc-build',
							toolName: 'build-workflow',
							args: {},
							isLoading: false,
							result: { success: true, workflowId },
						},
					],
				},
			} as never);
		}

		async function emitFailure(report: WorkflowFailuresReport = failureReport) {
			await vi.waitFor(() => {
				expect(workflowPreviewEmit).not.toBeNull();
			});
			workflowPreviewEmit?.('workflow-failures', report);
		}

		it('renders the card when the iframe reports a workflow failure', async () => {
			seedThreadArtifact();
			const { getByTestId, findByTestId } = renderView({ props: { threadId: 'thread-1' } });
			openPreviewForBuild();

			await emitFailure();

			const panel = await findByTestId('instance-ai-fix-with-ai-panel');
			expect(panel).toHaveTextContent('Execution failed in ‘Extract Emails’ node');
			expect(getByTestId('instance-ai-fix-with-ai-button')).toBeInTheDocument();
		});

		it('hides the card after dismiss', async () => {
			seedThreadArtifact();
			const user = userEvent.setup();
			const { findByTestId, queryByTestId } = renderView({ props: { threadId: 'thread-1' } });
			openPreviewForBuild();

			await emitFailure();
			await user.click(await findByTestId('instance-ai-fix-with-ai-dismiss'));

			await vi.waitFor(() => {
				expect(queryByTestId('instance-ai-fix-with-ai-panel')).not.toBeInTheDocument();
			});
		});

		it('sends a fix prompt that names the failed node, error and workflow', async () => {
			seedThreadArtifact('wf-1', 'My Workflow');
			const user = userEvent.setup();
			const { findByTestId } = renderView({ props: { threadId: 'thread-1' } });
			openPreviewForBuild();

			await emitFailure();
			await user.click(await findByTestId('instance-ai-fix-with-ai-button'));

			expect(thread.sendMessage).toHaveBeenCalledOnce();
			const [prompt] = vi.mocked(thread.sendMessage).mock.calls[0];
			expect(prompt).toContain('Extract Emails');
			expect(prompt).toContain('Intentional break');
			expect(prompt).toContain('My Workflow');
		});

		it('hides the card while the chat is busy', async () => {
			seedThreadArtifact();
			thread.isStreaming = true;

			const { queryByTestId } = renderView({ props: { threadId: 'thread-1' } });
			openPreviewForBuild();

			await emitFailure();

			expect(queryByTestId('instance-ai-fix-with-ai-panel')).not.toBeInTheDocument();
		});
	});

	describe('test-your-agent suggestion', () => {
		const AGENT_TARGET = { agentId: 'agent-1', projectId: 'project-1', name: 'Trip Planner' };

		function seedReadyAgent() {
			testAgentOfferState.evalsFlagEnabled = true;
			testAgentOfferState.capabilitySummary = {
				id: 'agent-1',
				name: 'Trip Planner',
				model: { provider: 'anthropic', model: 'claude-sonnet-4-5' },
				channels: [],
				tools: [{ type: 'custom', name: 'search' }],
				mcpServers: [],
				skills: [],
				tasks: [],
			};
			store.getThreadMetadata.mockReturnValue({
				instanceAiAgentBuilderTarget: AGENT_TARGET,
			});
		}

		it('suggests testing once the agent is set up', async () => {
			seedReadyAgent();

			const { findByTestId } = renderView({ props: { threadId: 'thread-1' } });

			const panel = await findByTestId('instance-ai-test-agent-panel');
			expect(panel).toHaveTextContent('Test your agent');
		});

		it('stays hidden while the flag is off', () => {
			seedReadyAgent();
			testAgentOfferState.evalsFlagEnabled = false;

			const { queryByTestId } = renderView({ props: { threadId: 'thread-1' } });

			expect(queryByTestId('instance-ai-test-agent-panel')).not.toBeInTheDocument();
		});

		it('stays hidden until the builder has persisted an agent', () => {
			seedReadyAgent();
			store.getThreadMetadata.mockReturnValue(undefined);

			const { queryByTestId } = renderView({ props: { threadId: 'thread-1' } });

			expect(queryByTestId('instance-ai-test-agent-panel')).not.toBeInTheDocument();
		});

		it('stays hidden while the agent is still being built', () => {
			seedReadyAgent();
			thread.isStreaming = true;

			const { queryByTestId } = renderView({ props: { threadId: 'thread-1' } });

			expect(queryByTestId('instance-ai-test-agent-panel')).not.toBeInTheDocument();
		});

		it('stays hidden once the agent already has test cases', () => {
			seedReadyAgent();
			const evalsStore = mockedStore(useAgentEvalsStore);
			evalsStore.isLoaded.mockReturnValue(true);
			evalsStore.getDatasets.mockReturnValue([{ id: 'dataset-1' }] as never);

			const { queryByTestId } = renderView({ props: { threadId: 'thread-1' } });

			expect(queryByTestId('instance-ai-test-agent-panel')).not.toBeInTheDocument();
		});

		it('still suggests when the dataset list has loaded and is empty', async () => {
			seedReadyAgent();
			const evalsStore = mockedStore(useAgentEvalsStore);
			evalsStore.isLoaded.mockReturnValue(true);
			evalsStore.getDatasets.mockReturnValue([]);

			const { findByTestId } = renderView({ props: { threadId: 'thread-1' } });

			expect(await findByTestId('instance-ai-test-agent-panel')).toBeInTheDocument();
		});

		it('stays hidden for an agent with no tools or skills', () => {
			seedReadyAgent();
			testAgentOfferState.capabilitySummary = {
				...(testAgentOfferState.capabilitySummary as Record<string, unknown>),
				tools: [],
				skills: [],
			};

			const { queryByTestId } = renderView({ props: { threadId: 'thread-1' } });

			expect(queryByTestId('instance-ai-test-agent-panel')).not.toBeInTheDocument();
		});

		it('stays hidden once dismissed for this agent', () => {
			seedReadyAgent();
			store.getThreadMetadata.mockReturnValue({
				instanceAiAgentBuilderTarget: AGENT_TARGET,
				dismissedContextKeys: ['test-agent:agent-1'],
			});

			const { queryByTestId } = renderView({ props: { threadId: 'thread-1' } });

			expect(queryByTestId('instance-ai-test-agent-panel')).not.toBeInTheDocument();
		});

		it('still suggests when a different agent was dismissed', async () => {
			seedReadyAgent();
			store.getThreadMetadata.mockReturnValue({
				instanceAiAgentBuilderTarget: AGENT_TARGET,
				dismissedContextKeys: ['test-agent:agent-other'],
			});

			const { findByTestId } = renderView({ props: { threadId: 'thread-1' } });

			expect(await findByTestId('instance-ai-test-agent-panel')).toBeInTheDocument();
		});

		it('requests the evals surface with generation and dismisses on the CTA', async () => {
			seedReadyAgent();
			const user = userEvent.setup();
			const evalsStore = mockedStore(useAgentEvalsStore);
			const { findByTestId } = renderView({ props: { threadId: 'thread-1' } });

			await user.click(await findByTestId('instance-ai-test-agent-generate'));

			expect(evalsStore.requestEvalsFocus).toHaveBeenCalledWith('agent-1', true);
			expect(store.updateThreadMetadata).toHaveBeenCalledWith('thread-1', {
				dismissedContextKeys: ['test-agent:agent-1'],
			});
		});

		it('still suggests when a finished run left a confirmation unresolved', async () => {
			// A lingering confirmation is not "still working" — suppressing on it
			// would hide the suggestion for the rest of the thread's life.
			seedReadyAgent();
			thread.isAwaitingConfirmation = true;

			const { findByTestId } = renderView({ props: { threadId: 'thread-1' } });

			expect(await findByTestId('instance-ai-test-agent-panel')).toBeInTheDocument();
		});

		it('drops an unclaimed focus request when the thread is left', () => {
			seedReadyAgent();
			const evalsStore = mockedStore(useAgentEvalsStore);
			const { unmount } = renderView({ props: { threadId: 'thread-1' } });

			mockRouteState.params = { threadId: 'thread-2' };
			unmount();

			expect(evalsStore.clearEvalsFocus).toHaveBeenCalledWith('agent-1');
		});

		it('keeps a focus request when a duplicate instance unmounts on the same thread', () => {
			seedReadyAgent();
			const evalsStore = mockedStore(useAgentEvalsStore);
			const { unmount } = renderView({ props: { threadId: 'thread-1' } });

			unmount();

			expect(evalsStore.clearEvalsFocus).not.toHaveBeenCalled();
		});

		it('persists the dismissal without requesting generation on "Maybe later"', async () => {
			seedReadyAgent();
			const user = userEvent.setup();
			const evalsStore = mockedStore(useAgentEvalsStore);
			const { findByTestId } = renderView({ props: { threadId: 'thread-1' } });

			await user.click(await findByTestId('instance-ai-test-agent-dismiss'));

			expect(evalsStore.requestEvalsFocus).not.toHaveBeenCalled();
			expect(store.updateThreadMetadata).toHaveBeenCalledWith('thread-1', {
				dismissedContextKeys: ['test-agent:agent-1'],
			});
		});
	});

	it('focuses the main composer when asking for plan edits', async () => {
		thread.messages = [makePlanReviewMessage()];

		const { getByTestId } = renderView({ props: { threadId: 'thread-1' } });

		await vi.waitFor(() => {
			expect(getByTestId('instance-ai-plan-ask-for-edits')).toBeInTheDocument();
		});

		await getByTestId('instance-ai-plan-ask-for-edits').click();

		await vi.waitFor(() => {
			expect(inputFocusSpy).toHaveBeenCalled();
			expect(getByTestId('instance-ai-input-mode')).toHaveTextContent('plan-edit');
		});
	});

	it('scrubs credential patterns from plan-edit feedback before sending to telemetry, but keeps the raw text in the backend confirmation', async () => {
		thread.messages = [makePlanReviewMessage()];
		planEditSubmitState.message = 'use sk-proj-abcdef1234567890XYZ to call the API';

		const { getByTestId } = renderView({ props: { threadId: 'thread-1' } });

		await vi.waitFor(() => {
			expect(getByTestId('instance-ai-plan-ask-for-edits')).toBeInTheDocument();
		});
		await getByTestId('instance-ai-plan-ask-for-edits').click();
		await getByTestId('instance-ai-input-submit').click();

		expect(telemetryTrackSpy).toHaveBeenCalledWith(
			'User finished providing input',
			expect.objectContaining({
				feedback: 'use [REDACTED] to call the API',
				plan_feedback_type: 'changes_requested',
			}),
		);
		expect(thread.confirmAction).toHaveBeenCalledWith('req-plan', {
			kind: 'approval',
			approved: false,
			userInput: 'use sk-proj-abcdef1234567890XYZ to call the API',
		});
	});

	it('submits plan edit feedback through confirmation instead of a new chat message', async () => {
		thread.messages = [makePlanReviewMessage()];

		const { getByTestId } = renderView({ props: { threadId: 'thread-1' } });

		await vi.waitFor(() => {
			expect(getByTestId('instance-ai-plan-ask-for-edits')).toBeInTheDocument();
		});
		await getByTestId('instance-ai-plan-ask-for-edits').click();
		await getByTestId('instance-ai-input-submit').click();

		expect(thread.confirmAction).toHaveBeenCalledWith('req-plan', {
			kind: 'approval',
			approved: false,
			userInput: 'Make the plan simpler',
		});
		// resolveConfirmation only fires after the backend call succeeds, so it
		// happens on the next tick once the confirmAction promise resolves.
		await vi.waitFor(() => {
			expect(thread.resolveConfirmation).toHaveBeenCalledWith('req-plan', 'changes-requested');
		});
		expect(thread.sendMessage).not.toHaveBeenCalled();
	});

	it('does not resolve the plan when the backend confirmAction fails', async () => {
		thread.messages = [makePlanReviewMessage()];
		vi.mocked(thread.confirmAction).mockResolvedValueOnce(false);

		const { getByTestId } = renderView({ props: { threadId: 'thread-1' } });

		await vi.waitFor(() => {
			expect(getByTestId('instance-ai-plan-ask-for-edits')).toBeInTheDocument();
		});
		await getByTestId('instance-ai-plan-ask-for-edits').click();
		await getByTestId('instance-ai-input-submit').click();

		await vi.waitFor(() => {
			expect(thread.clearPlanUpdatePending).toHaveBeenCalledWith('req-plan');
		});
		expect(thread.resolveConfirmation).not.toHaveBeenCalled();
	});

	describe('runtime disposal on unmount', () => {
		it('keeps the runtime when unmounting while the route still points at the thread', () => {
			// A duplicate instance created and discarded during a layout transition
			// (e.g. an editor hand-off) unmounts while the route still shows the
			// thread — it must not tear down the runtime the live instance renders.
			const { unmount } = renderView({ props: { threadId: 'thread-1' } });

			unmount();

			expect(store.disposeRuntime).not.toHaveBeenCalled();
		});

		it('disposes the runtime when unmounting after the route left the thread', () => {
			const { unmount } = renderView({ props: { threadId: 'thread-1' } });

			mockRouteState.params = { threadId: 'thread-2' };
			unmount();

			expect(store.disposeRuntime).toHaveBeenCalledWith('thread-1');
		});
	});

	it('keeps normal composer submissions as chat messages', async () => {
		const { getByTestId } = renderView({ props: { threadId: 'thread-1' } });

		await getByTestId('instance-ai-input-submit').click();

		expect(thread.sendMessage).toHaveBeenCalledWith(
			'Normal message',
			undefined,
			expect.any(String),
			undefined,
		);
		expect(thread.confirmAction).not.toHaveBeenCalled();
	});
});
