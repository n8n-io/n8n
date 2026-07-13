import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, reactive, ref } from 'vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import InstanceAiThreadView from '../InstanceAiThreadView.vue';
import { useInstanceAiStore, type ThreadRuntime } from '../instanceAi.store';
import type { PlanEditContext } from '../instanceAi.threadRuntime';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { SidebarStateKey } from '../instanceAiLayout';
import type { WorkflowFailuresReport } from '../components/InstanceAiWorkflowPreview.vue';
import type {
	FrontendModuleSettings,
	InstanceAiAgentNode,
	InstanceAiMessage,
} from '@n8n/api-types';

const mockWindowSizeState = vi.hoisted(() => ({
	width: { value: 1200 },
}));

const planEditSubmitState = vi.hoisted(() => ({
	message: 'Make the plan simpler',
}));

const telemetryTrackSpy = vi.hoisted(() => vi.fn());
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

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: telemetryTrackSpy }),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn(), showMessage: vi.fn() }),
}));

vi.mock('@/app/composables/usePageRedirectionHelper', () => ({
	usePageRedirectionHelper: () => ({ goToUpgrade: vi.fn() }),
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
		push: vi.fn(),
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
}));

const inputFocusSpy = vi.fn();

const InstanceAiInputStub = defineComponent({
	name: 'InstanceAiInputStub',
	props: {
		suggestions: { type: Array, required: false },
		isStreaming: { type: Boolean, required: false },
		isPlanEditMode: { type: Boolean, required: false },
		isWorkflowBuilderAvailable: { type: Boolean, required: false },
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
					'span',
					{ 'data-test-id': 'instance-ai-input-availability' },
					props.isWorkflowBuilderAvailable === false ? 'unavailable' : 'available',
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
		refreshKey: { type: Number, required: true },
	},
	setup(props) {
		return () =>
			h('div', {
				'data-test-id': 'instance-ai-agent-preview-stub',
				'data-agent-id': props.agentId,
				'data-project-id': props.projectId,
				'data-refresh-key': String(props.refreshKey),
			});
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

const renderView = createComponentRenderer(InstanceAiThreadView, {
	global: {
		provide: {
			[SidebarStateKey as symbol]: { collapsed: ref(false), toggle: vi.fn() },
		},
		stubs: {
			InstanceAiInput: InstanceAiInputStub,
			InstanceAiWorkflowPreview: InstanceAiWorkflowPreviewStub,
			InstanceAiAgentPreview: InstanceAiAgentPreviewStub,
			InstanceAiConfirmationPanel: InstanceAiConfirmationPanelStub,
			AgentSection: { template: '<div data-test-id="agent-section-stub" />' },
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
			sendMessage: vi.fn().mockResolvedValue(undefined),
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
		mockWindowSizeState.width.value = 1200;

		// Auto-stubbed push-store actions return undefined by default; addEventListener's
		// caller expects a removeListener function, so return a no-op.
		const pushStore = mockedStore(usePushConnectionStore);
		pushStore.addEventListener.mockReturnValue(() => {});
		inputFocusSpy.mockClear();
		telemetryTrackSpy.mockClear();
		planEditSubmitState.message = 'Make the plan simpler';
		mockRouteState.params = { threadId: 'thread-1' };
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
				children: [],
				toolCalls: [
					{
						toolCallId: 'tc-create-agent',
						toolName: 'agent_builder',
						args: { action: 'create_agent' },
						isLoading: false,
						result: {
							ok: true,
							agentId: 'agent-1',
							projectId: 'proj-1',
							name: 'SEO Auditor',
						},
					},
				],
			},
		} as never);

		const preview = await findByTestId('instance-ai-agent-preview-stub');

		expect(preview).toHaveAttribute('data-agent-id', 'agent-1');
		expect(preview).toHaveAttribute('data-project-id', 'proj-1');
		expect(preview).toHaveAttribute('data-refresh-key', '1');
	});

	it('closes the agent artifact preview from the wrapper toggle', async () => {
		thread.producedArtifacts = new Map([
			['agent-1', { type: 'agent', id: 'agent-1', projectId: 'proj-1', name: 'SEO Auditor' }],
		]) as typeof thread.producedArtifacts;

		const user = userEvent.setup();
		const { findByTestId, queryByTestId } = renderView({ props: { threadId: 'thread-1' } });

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
				children: [],
				toolCalls: [
					{
						toolCallId: 'tc-create-agent',
						toolName: 'agent_builder',
						args: { action: 'create_agent' },
						isLoading: false,
						result: {
							ok: true,
							agentId: 'agent-1',
							projectId: 'proj-1',
							name: 'SEO Auditor',
						},
					},
				],
			},
		} as never);

		await findByTestId('instance-ai-agent-preview-stub');
		const previewPanel = await findByTestId('instance-ai-preview-panel');
		expect(previewPanel).toBeVisible();

		await user.click(await findByTestId('instance-ai-artifacts-preview-toggle'));

		await vi.waitFor(() => {
			expect(previewPanel).not.toBeVisible();
		});
		expect(queryByTestId('instance-ai-agent-preview-stub')).not.toBeInTheDocument();
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
		);
		expect(thread.confirmAction).not.toHaveBeenCalled();
	});
});
