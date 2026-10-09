import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import type { AgentResumeFailure } from '@/features/agents/utils/chat-rejection';
import type { ChatMessage } from '@/features/ai/shared/agentsChat/types';
import { USER_TYPED_MESSAGE } from '../../prefills';
import InstanceAiAgentsConversation from '../InstanceAiAgentsConversation.vue';
import { provideThread, useInstanceAiStore, type ThreadRuntime } from '../../instanceAi.store';
import { fetchThread } from '../../instanceAi.memory.api';
import { OWNER, TEAMMATE, setUpSharing } from '../../sharing/__tests__/sharingFixtures';
import {
	stashPendingFirstMessage,
	stashPendingFirstMessageFiles,
	stashPendingHandoffContext,
} from '../../composables/useInstanceAiHandoff';

const chatState = vi.hoisted(() => ({
	messages: null as unknown as { value: ChatMessage[] },
	isStreaming: null as unknown as { value: boolean },
	isLoadingHistory: null as unknown as { value: boolean },
	hostContext: undefined as (() => Record<string, unknown> | undefined) | undefined,
	emitAccepted: undefined as
		| ((payload: { text: string; files: File[]; hostContext?: Record<string, unknown> }) => void)
		| undefined,
	sendMessageFromOutside: undefined as unknown as ReturnType<typeof vi.fn>,
	setDraft: undefined as unknown as ReturnType<typeof vi.fn>,
	openFilePicker: undefined as unknown as ReturnType<typeof vi.fn>,
	focusInput: undefined as unknown as ReturnType<typeof vi.fn>,
	emitResumeFailed: undefined as ((failure: AgentResumeFailure) => void) | undefined,
}));

const toast = vi.hoisted(() => ({ showMessage: vi.fn(), showError: vi.fn() }));

vi.mock('@n8n/composables/useToast', () => ({ useToast: () => toast }));

vi.mock('../InstanceAiInputMenu.vue', async () => {
	const { defineComponent: define, h: render } = await import('vue');
	return {
		default: define({
			props: { threadId: { type: String, required: false } },
			emits: ['attach-files'],
			setup(props, { emit }) {
				return () =>
					render('button', {
						'data-test-id': 'input-menu-stub',
						'data-thread-id': props.threadId,
						onClick: () => emit('attach-files'),
					});
			},
		}),
	};
});

vi.mock('@/features/agents/components/AgentChatPanel.vue', async () => {
	const { defineComponent: define, h: render } = await import('vue');
	return {
		default: define({
			name: 'AgentChatPanelStub',
			props: {
				projectId: { type: String, required: true },
				hostContext: { type: Function, required: false },
				attachmentAccept: { type: String, required: false },
				showAttachButton: { type: Boolean, default: true },
			},
			emits: ['message-accepted', 'resume-failed'],
			setup(props, { expose, emit, slots }) {
				chatState.hostContext = props.hostContext as typeof chatState.hostContext;
				chatState.emitAccepted = (payload) => emit('message-accepted', payload);
				chatState.emitResumeFailed = (failure) => emit('resume-failed', failure);
				expose({
					messages: chatState.messages,
					isStreaming: chatState.isStreaming,
					isLoadingHistory: chatState.isLoadingHistory,
					sendMessageFromOutside: chatState.sendMessageFromOutside,
					setDraft: chatState.setDraft,
					openFilePicker: chatState.openFilePicker,
					focusInput: chatState.focusInput,
					isDirty: () => false,
				});
				return () =>
					render(
						'div',
						{
							'data-test-id': 'chat-panel',
							'data-accept': props.attachmentAccept,
							'data-attach-button': String(props.showAttachButton),
						},
						[
							props.projectId,
							slots['above-input']?.(),
							slots['inline-offers']?.(),
							// Like the real panel: the composer slot replaces the composer.
							...(slots.composer
								? [slots.composer()]
								: [slots['composer-attachments']?.(), slots['footer-start']?.()]),
						],
					);
			},
		}),
	};
});

vi.mock('@/features/agents/composables/useAgentExecutionUpdates', () => ({
	useAgentExecutionUpdates: vi.fn(() => vi.fn()),
}));

vi.mock('../../instanceAi.memory.api', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../instanceAi.memory.api')>()),
	fetchThread: vi.fn(),
}));

const threadInfo = (title: string, metadata?: Record<string, unknown>) => ({
	thread: {
		id: 'thread-1',
		title,
		resourceId: 'user-1',
		projectId: 'project-1',
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		...(metadata ? { metadata } : {}),
	},
});

const OFFICE_ID = '3f1c2b6e-8a4d-4e2b-9c1a-7d5e6f8a9b0c';

let runtime: ThreadRuntime;

const Host = defineComponent({
	setup() {
		runtime = provideThread('thread-1');
		return () =>
			h(InstanceAiAgentsConversation, null, {
				'above-input': () => h('div', { 'data-test-id': 'above-input-slot' }),
				'inline-offers': () => h('div', { 'data-test-id': 'inline-offers-slot' }),
			});
	},
});

const renderComponent = createComponentRenderer(Host);

describe('InstanceAiAgentsConversation', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		setActivePinia(createTestingPinia({ stubActions: false }));
		localStorage.clear();
		chatState.messages = ref<ChatMessage[]>([]);
		chatState.isStreaming = ref(false);
		chatState.isLoadingHistory = ref(true);
		chatState.hostContext = undefined;
		chatState.sendMessageFromOutside = vi.fn().mockResolvedValue(true);
		chatState.setDraft = vi.fn();
		chatState.openFilePicker = vi.fn();
		chatState.focusInput = vi.fn();
		vi.mocked(fetchThread).mockResolvedValue(threadInfo('First title'));
	});

	afterEach(() => {
		useInstanceAiStore().disposeRuntime('thread-1');
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	it('should resolve the project from the thread info and mount the chat', async () => {
		const { findByTestId, getByTestId } = renderComponent();
		expect(runtime.hydrationStatus).toBe('hydrating');

		const panel = await findByTestId('chat-panel');
		expect(panel.textContent).toContain('project-1');
		expect(panel.dataset.accept).toBe('');
		expect(runtime.projectId).toBe('project-1');
		expect(useInstanceAiStore().threads[0].title).toBe('First title');
		expect(getByTestId('above-input-slot')).toBeInTheDocument();
		expect(getByTestId('inline-offers-slot')).toBeInTheDocument();
	});

	it('should render the input menu in the composer and open the file picker from it', async () => {
		const { findByTestId } = renderComponent();
		const panel = await findByTestId('chat-panel');
		// The menu offers attachments, so the composer hides its own attach button.
		expect(panel.dataset.attachButton).toBe('false');

		const menu = await findByTestId('input-menu-stub');
		expect(menu.dataset.threadId).toBe('thread-1');
		menu.click();

		expect(chatState.openFilePicker).toHaveBeenCalledOnce();
	});

	it('should mirror the chat into the thread runtime once the history has loaded', async () => {
		const { findByTestId } = renderComponent();
		await findByTestId('chat-panel');

		chatState.messages.value = [
			{ id: 'u-1', role: 'user', content: 'Build it' },
			{
				id: 'a-1',
				role: 'assistant',
				content: '',
				toolCalls: [
					{
						tool: 'build-workflow',
						toolCallId: 'tc-1',
						state: 'done',
						output: { success: true, workflowId: 'wf-1', workflowName: 'Orders' },
					},
				],
			},
		];
		await flushPromises();
		expect(runtime.hydrationStatus).toBe('hydrating');

		chatState.isLoadingHistory.value = false;
		await flushPromises();
		expect(runtime.hydrationStatus).toBe('ready');
		expect(runtime.messages).toHaveLength(2);
		expect(runtime.producedArtifacts.get('wf-1')?.name).toBe('Orders');

		chatState.isStreaming.value = true;
		await flushPromises();
		expect(runtime.isStreaming).toBe(true);
	});

	it('should refresh the thread info when a turn finishes and again after the refine delay', async () => {
		const { findByTestId } = renderComponent();
		await findByTestId('chat-panel');
		chatState.isLoadingHistory.value = false;
		await flushPromises();
		vi.mocked(fetchThread).mockClear();

		chatState.isStreaming.value = true;
		await flushPromises();
		expect(fetchThread).not.toHaveBeenCalled();

		vi.mocked(fetchThread).mockResolvedValue(
			threadInfo('Heuristic title', {
				instanceAiTasks: { tasks: [{ id: 't-1', description: 'Build A', status: 'todo' }] },
			}),
		);
		chatState.isStreaming.value = false;
		await flushPromises();
		expect(fetchThread).toHaveBeenCalledTimes(1);
		expect(useInstanceAiStore().threads[0].title).toBe('Heuristic title');
		expect(runtime.currentTasks?.tasks[0].description).toBe('Build A');

		vi.mocked(fetchThread).mockResolvedValue(threadInfo('Refined title'));
		await vi.advanceTimersByTimeAsync(5_000);
		expect(fetchThread).toHaveBeenCalledTimes(2);
		expect(useInstanceAiStore().threads[0].title).toBe('Refined title');
	});

	it('should send the client context as host context', async () => {
		const { findByTestId } = renderComponent();
		await findByTestId('chat-panel');

		const hostContext = chatState.hostContext?.();
		expect(hostContext).toEqual(
			expect.objectContaining({
				timeZone: expect.any(String),
				computerUseChannels: expect.any(Array),
			}),
		);
		expect(hostContext).not.toHaveProperty('context');
	});

	it('should send a stashed opener with its hand-off context and files through the chat', async () => {
		const file = new File(['x'], 'a.png', { type: 'image/png' });
		stashPendingFirstMessage('thread-1', {
			message: 'Help with this credential',
			authorship: { kind: 'prefill', prefillType: 'handoff_credential_setup' },
			context: {
				source: 'credential-modal',
				credential: { credentialType: 'slackApi', displayName: 'Slack' },
			},
			attachments: [{ type: 'workflow', id: 'wf-1', name: 'Orders' }],
		});
		stashPendingFirstMessageFiles('thread-1', [file]);

		const { findByTestId } = renderComponent();
		await findByTestId('chat-panel');
		await flushPromises();

		expect(chatState.sendMessageFromOutside).toHaveBeenCalledWith('Help with this credential', [
			file,
		]);
		const hostContext = chatState.hostContext?.();
		expect(hostContext?.context).toEqual(expect.objectContaining({ source: 'credential-modal' }));
		expect(hostContext?.attachments).toEqual([{ type: 'workflow', id: 'wf-1', name: 'Orders' }]);
		// The one-shot context does not leak into the next message.
		expect(chatState.hostContext?.()).not.toHaveProperty('context');
	});

	it('should send the run target of a stashed opener and read the thread back after it', async () => {
		const runTarget = { kind: 'linked' as const, instanceId: OFFICE_ID };
		stashPendingFirstMessage('thread-1', {
			message: 'Build a report',
			authorship: USER_TYPED_MESSAGE,
			runTarget,
		});
		const refresh = vi.spyOn(useInstanceAiStore(), 'refreshThread');

		const { findByTestId } = renderComponent();
		await findByTestId('chat-panel');
		await flushPromises();

		expect(chatState.sendMessageFromOutside.mock.calls[0]?.[0]).toBe('Build a report');
		expect(chatState.hostContext?.()).toEqual(expect.objectContaining({ runTarget }));
		// The one-shot run target does not leak into the next message.
		expect(chatState.hostContext?.()).not.toHaveProperty('runTarget');
		// The mount reads the thread once. The stored run target adds one more read.
		expect(refresh).toHaveBeenCalledTimes(2);
		expect(refresh).toHaveBeenLastCalledWith('thread-1');
	});

	it('should not read the thread back when the opener has no run target', async () => {
		stashPendingFirstMessage('thread-1', {
			message: 'Build a report',
			authorship: USER_TYPED_MESSAGE,
		});
		const refresh = vi.spyOn(useInstanceAiStore(), 'refreshThread');

		const { findByTestId } = renderComponent();
		await findByTestId('chat-panel');
		await flushPromises();

		expect(chatState.sendMessageFromOutside.mock.calls[0]?.[0]).toBe('Build a report');
		expect(chatState.hostContext?.()).not.toHaveProperty('runTarget');
		// Only the mount reads the thread.
		expect(refresh).toHaveBeenCalledTimes(1);
	});

	it('should route programmatic sends through the mounted chat', async () => {
		const { findByTestId } = renderComponent();
		await findByTestId('chat-panel');
		await flushPromises();

		const sent = await runtime.sendMessage('Fix it', {
			authorship: { kind: 'prefill', prefillType: 'handoff_fix_with_ai' },
		});

		expect(sent).toBe(true);
		expect(chatState.sendMessageFromOutside).toHaveBeenCalledWith('Fix it', undefined);
	});

	it('should focus the composer on the next tick when the store asks for it', async () => {
		const { findByTestId } = renderComponent();
		await findByTestId('chat-panel');
		await flushPromises();
		chatState.focusInput.mockClear();

		useInstanceAiStore().requestComposerFocus();
		await flushPromises();

		expect(chatState.focusInput).toHaveBeenCalledOnce();
	});

	it('should carry a pending hand-off context until a message is accepted', async () => {
		stashPendingHandoffContext('thread-1', {
			source: 'agent-preview',
			agentId: 'agent-1',
			threadId: 'preview-1',
			agentName: 'Support bot',
		});
		const { findByTestId, getByTestId } = renderComponent();
		await findByTestId('chat-panel');

		expect(getByTestId('instance-ai-handoff-context-chip')).toBeInTheDocument();
		const hostContext = chatState.hostContext?.();
		expect(hostContext?.context).toEqual(expect.objectContaining({ source: 'agent-preview' }));

		chatState.emitAccepted?.({ text: 'Why did it fail?', files: [], hostContext });
		await flushPromises();

		expect(chatState.hostContext?.()).not.toHaveProperty('context');
	});

	it('should report a missing thread', async () => {
		const { ResponseError } = await import('@n8n/rest-api-client');
		const error = new ResponseError('Not found', { httpStatusCode: 404 });
		vi.mocked(fetchThread).mockRejectedValue(error);
		const onMissing = vi.fn();
		const MissingHost = defineComponent({
			setup() {
				runtime = provideThread('thread-1');
				return () => h(InstanceAiAgentsConversation, { onThreadMissing: onMissing });
			},
		});

		createComponentRenderer(MissingHost)();
		await flushPromises();

		expect(onMissing).toHaveBeenCalled();
	});
});

describe('InstanceAiAgentsConversation with chat sharing', () => {
	const sharedInfo = {
		thread: {
			...threadInfo('Weekly digest').thread,
			resourceId: OWNER.id,
			sharedWith: { projectId: 'project-1', projectName: 'Marketing' },
			owner: OWNER,
		},
	};

	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		localStorage.clear();
		chatState.messages = ref<ChatMessage[]>([]);
		chatState.isStreaming = ref(false);
		chatState.isLoadingHistory = ref(true);
		chatState.sendMessageFromOutside = vi.fn().mockResolvedValue(true);
		chatState.focusInput = vi.fn();
		vi.mocked(fetchThread).mockResolvedValue(sharedInfo);
	});

	afterEach(() => {
		useInstanceAiStore().disposeRuntime('thread-1');
		vi.clearAllMocks();
	});

	async function renderAs(viewerId: string) {
		setUpSharing({ shared: true, viewerId });
		const view = renderComponent();
		await view.findByTestId('chat-panel');
		await flushPromises();
		return view;
	}

	it('replaces the composer of a teammate with a notice that names the owner', async () => {
		const { getByTestId, queryByTestId } = await renderAs(TEAMMATE.id);

		expect(getByTestId('instance-ai-shared-thread-notice')).toHaveTextContent(
			'Only Alice Owner can send messages here. You can still answer requests.',
		);
		expect(queryByTestId('input-menu-stub')).not.toBeInTheDocument();
	});

	it('keeps the composer for the owner of a shared chat', async () => {
		const { getByTestId, queryByTestId } = await renderAs(OWNER.id);

		expect(getByTestId('input-menu-stub')).toBeInTheDocument();
		expect(queryByTestId('instance-ai-shared-thread-notice')).not.toBeInTheDocument();
	});

	it('shows a teammate none of the offers and panels that send a message', async () => {
		const { queryByTestId } = await renderAs(TEAMMATE.id);

		// The thread view puts "Fix with AI", "Make it automatic", the test-agent offer and
		// the setup panel in these slots. Each of them sends a chat message.
		expect(queryByTestId('inline-offers-slot')).not.toBeInTheDocument();
		expect(queryByTestId('above-input-slot')).not.toBeInTheDocument();
	});

	it('keeps the offers and panels for the owner of a shared chat', async () => {
		const { getByTestId } = await renderAs(OWNER.id);

		expect(getByTestId('inline-offers-slot')).toBeInTheDocument();
		expect(getByTestId('above-input-slot')).toBeInTheDocument();
	});

	it('says who answered first when the server refuses an answer with a 409', async () => {
		await renderAs(TEAMMATE.id);

		chatState.emitResumeFailed?.({ toolCallId: 'tc-1', status: 409, answeredBy: 'Alice Owner' });

		expect(toast.showMessage).toHaveBeenCalledWith({
			type: 'info',
			title: 'Already answered by Alice Owner.',
		});
	});

	it('reads who answered first from the history after a lost race', async () => {
		await renderAs(TEAMMATE.id);
		chatState.messages.value = [
			{
				id: 'a-1',
				role: 'assistant',
				content: '',
				toolCalls: [{ tool: 'executions', toolCallId: 'tc-1', state: 'done', approvedBy: OWNER }],
			},
		];

		chatState.emitResumeFailed?.({ toolCallId: 'tc-1' });

		expect(toast.showMessage).toHaveBeenCalledWith({
			type: 'info',
			title: 'Already answered by Alice Owner.',
		});
	});

	it('tells a teammate who answered in another tab that they answered already', async () => {
		await renderAs(TEAMMATE.id);
		chatState.messages.value = [
			{
				id: 'a-1',
				role: 'assistant',
				content: '',
				toolCalls: [
					{ tool: 'executions', toolCallId: 'tc-1', state: 'done', approvedBy: TEAMMATE },
				],
			},
		];

		chatState.emitResumeFailed?.({ toolCallId: 'tc-1', status: 409, answeredBy: TEAMMATE.name });

		expect(toast.showMessage).toHaveBeenCalledWith({
			type: 'info',
			title: 'You already answered this.',
		});
	});

	describe('in a private chat', () => {
		async function renderPrivate() {
			vi.mocked(fetchThread).mockResolvedValue(threadInfo('Weekly digest'));
			setUpSharing({ viewerId: 'user-1' });
			const view = renderComponent();
			await view.findByTestId('chat-panel');
			await flushPromises();
			return view;
		}

		it('tells the owner that they answered a stale card already', async () => {
			await renderPrivate();

			// The history was not read again, so only the name in the 409 is known.
			chatState.emitResumeFailed?.({ toolCallId: 'tc-1', status: 409, answeredBy: 'Alice Owner' });

			expect(toast.showMessage).toHaveBeenCalledWith({
				type: 'info',
				title: 'You already answered this.',
			});
		});

		it('names nobody for a 409 that names nobody', async () => {
			await renderPrivate();

			chatState.emitResumeFailed?.({ toolCallId: 'tc-1', status: 409 });

			expect(toast.showMessage).toHaveBeenCalledWith({
				type: 'info',
				title: 'This request was already answered.',
			});
		});
	});

	it('shows the reason when the server refuses the answer, in a toast that is not tracked', async () => {
		await renderAs(TEAMMATE.id);

		chatState.emitResumeFailed?.({
			toolCallId: 'tc-1',
			status: 403,
			message: 'Only editors in Marketing can approve this.',
		});

		// The reason names a project, so it must not go to telemetry.
		expect(toast.showMessage).toHaveBeenCalledWith(
			{
				type: 'error',
				title: "Couldn't send your answer",
				message: 'Only editors in Marketing can approve this.',
			},
			false,
		);
	});

	it('adds no toast to a stream error when nobody else answered', async () => {
		await renderAs(OWNER.id);
		chatState.messages.value = [
			{
				id: 'a-1',
				role: 'assistant',
				content: '',
				toolCalls: [{ tool: 'executions', toolCallId: 'tc-1', state: 'done', approvedBy: OWNER }],
			},
		];

		chatState.emitResumeFailed?.({ toolCallId: 'tc-1' });

		expect(toast.showMessage).not.toHaveBeenCalled();
	});
});
