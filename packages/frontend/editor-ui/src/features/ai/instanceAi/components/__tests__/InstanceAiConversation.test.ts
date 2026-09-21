import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, reactive } from 'vue';
import { mount } from '@vue/test-utils';
import { fireEvent } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { mockedStore } from '@/__tests__/utils';
import { useSettingsStore } from '@n8n/stores/settings.store';
import {
	createThreadComponentRenderer,
	defaultModuleSettings,
	InstanceAiInputStub,
	inputSetSelectionSpy,
	inputSetTextSpy,
	makeThread,
} from '../../__tests__/createThreadComponentRenderer';
import InstanceAiConversation from '../InstanceAiConversation.vue';
import { provideThread, useInstanceAiStore, type ThreadRuntime } from '../../instanceAi.store';
import {
	getPendingWorkflowAttachment,
	consumePendingMentionDraft,
	stashPendingAgentAttachment,
	stashPendingRedirectLanding,
	stashPendingWorkflowAttachment,
	stashPendingMentionDraft,
} from '../../composables/useInstanceAiHandoff';
import type { InstanceAiEmbedSubject } from '../../embed/instanceAiEmbed.types';
import type { InstanceAiHandoffContext, InstanceAiMessage } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { USER_TYPED_MESSAGE } from '../../prefills';
import { buildDraftMention } from '../../mentions/buildMentionAttachment';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

const telemetryTrackSpy = vi.hoisted(() => vi.fn());
const showMessageSpy = vi.hoisted(() => vi.fn());
const showErrorSpy = vi.hoisted(() => vi.fn());
const handleRedirectLandingSpy = vi.hoisted(() => vi.fn());

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: telemetryTrackSpy }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: showErrorSpy, showMessage: showMessageSpy }),
}));

vi.mock('@/experiments/openWorkflowInAssistant/stores/openWorkflowInAssistant.store', () => ({
	useOpenWorkflowInAssistantStore: () => ({
		handleRedirectLanding: handleRedirectLandingSpy,
	}),
}));

vi.mock('@/app/composables/usePageRedirectionHelper', () => ({
	usePageRedirectionHelper: () => ({ goToUpgrade: vi.fn() }),
}));

vi.mock('@vueuse/core', async (importOriginal) => ({
	...(await importOriginal<typeof import('@vueuse/core')>()),
	useScroll: () => ({ arrivedState: { bottom: true } }),
}));

describe('InstanceAiConversation', () => {
	let store: ReturnType<typeof mockedStore<typeof useInstanceAiStore>>;
	let thread: ThreadRuntime;

	beforeEach(() => {
		// Prevent stashed hand-off state from leaking between test cases.
		localStorage.clear();
		const pinia = createTestingPinia();
		setActivePinia(pinia);
		useSettingsStore().moduleSettings = { 'instance-ai': { ...defaultModuleSettings } };

		thread = makeThread();
		store = mockedStore(useInstanceAiStore);
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
		store.updateThreadMetadata.mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
	});

	// `createThreadComponentRenderer` wraps the component in a plain provider — it
	// doesn't re-emit the child's events, so DOM-only assertions use it, while emit
	// assertions mount a small host directly with `@vue/test-utils` and read the
	// child wrapper's own `emitted()`.
	function mountConversation() {
		const Host = defineComponent({
			setup() {
				provideThread(thread);
				return () => h(InstanceAiConversation);
			},
		});
		return mount(Host, { global: { stubs: { InstanceAiInput: InstanceAiInputStub } } });
	}

	it('renders visible messages from the thread', () => {
		thread.messages = [
			{ id: 'm1', role: 'user', content: 'Hello', createdAt: '2026-04-01T00:00:00.000Z' },
		] as InstanceAiMessage[];
		const renderer = createThreadComponentRenderer(
			InstanceAiConversation,
			{
				global: { stubs: { InstanceAiInput: InstanceAiInputStub } },
			},
			() => thread,
		);
		const { getByText } = renderer();
		expect(getByText('Hello')).toBeInTheDocument();
	});

	it('renders the above-input and inline-offers slots', () => {
		const renderer = createThreadComponentRenderer(
			InstanceAiConversation,
			{
				global: { stubs: { InstanceAiInput: InstanceAiInputStub } },
				slots: {
					'above-input': () => h('div', { 'data-test-id': 'above-input-slot' }),
					'inline-offers': () => h('div', { 'data-test-id': 'inline-offers-slot' }),
				},
			},
			() => thread,
		);
		const { getByTestId } = renderer();
		expect(getByTestId('above-input-slot')).toBeInTheDocument();
		expect(getByTestId('inline-offers-slot')).toBeInTheDocument();
	});

	it('emits thread-missing when the thread cannot be found', async () => {
		store.threads = [];
		const notFound = new ResponseError('Not found');
		notFound.httpStatusCode = 404;
		store.loadThread.mockRejectedValue(notFound);
		const wrapper = mountConversation();
		const conversation = wrapper.findComponent(InstanceAiConversation);
		await vi.waitFor(() => expect(conversation.emitted('thread-missing')).toBeTruthy());
	});

	it('emits agent-attachment-restored when a pending attachment is restored', async () => {
		stashPendingAgentAttachment('thread-1', {
			type: 'agent',
			id: 'agent-1',
			projectId: 'proj-1',
			pending: true,
		});

		const wrapper = mountConversation();
		const conversation = wrapper.findComponent(InstanceAiConversation);
		await vi.waitFor(() => expect(conversation.emitted('agent-attachment-restored')).toBeTruthy());
		expect(conversation.emitted('agent-attachment-restored')?.[0]).toEqual([
			{ type: 'agent', id: 'agent-1', projectId: 'proj-1', pending: true },
		]);
	});

	it('consumes a mention draft once and restores its text, mentions, and caret', async () => {
		const mention = buildDraftMention(
			{ kind: 'workflow', workflowId: 'workflow-1', workflowName: 'Support triage' },
			'typed',
		);
		stashPendingMentionDraft('thread-1', {
			text: 'Review Support triage ',
			mentions: [mention],
			selectionStart: 22,
			selectionEnd: 22,
		});

		mountConversation();

		await vi.waitFor(() => expect(thread.setDraftMentions).toHaveBeenCalledWith([mention]));
		expect(inputSetTextSpy).toHaveBeenCalledWith('Review Support triage ');
		await vi.waitFor(() => expect(inputSetSelectionSpy).toHaveBeenCalledWith(22, 22));
		expect(consumePendingMentionDraft('thread-1')).toBeNull();
	});

	describe('composer context chip label', () => {
		// Wraps the subject in `reactive` and returns it alongside the render
		// result, so a test can mutate `subject.name` after mount and assert the
		// chip follows the live value — the actual AGENT-954 scenario (a rename in
		// the builder while the panel stays open).
		function mountWithSubject(subject: InstanceAiEmbedSubject | undefined) {
			thread.sseState = 'disconnected';
			stashPendingAgentAttachment('thread-1', {
				type: 'agent',
				id: 'agent-1',
				projectId: 'proj-1',
				name: 'Stashed Name',
				pending: true,
			});
			const reactiveSubject = subject === undefined ? undefined : reactive({ ...subject });
			const renderer = createThreadComponentRenderer(
				InstanceAiConversation,
				{
					props: { subject: reactiveSubject },
					global: { stubs: { InstanceAiInput: InstanceAiInputStub } },
				},
				() => thread,
			);
			return { ...renderer(), subject: reactiveSubject };
		}

		it('prefers the live subject name over the stashed name when agent ids match', async () => {
			const { getByTestId } = mountWithSubject({
				type: 'agent',
				id: 'agent-1',
				projectId: 'proj-1',
				name: 'Renamed Live',
			});
			await vi.waitFor(() =>
				expect(getByTestId('instance-ai-input-context-chip').textContent).toBe('Renamed Live'),
			);
		});

		it('updates the chip when the live subject is renamed after mount', async () => {
			const { getByTestId, subject } = mountWithSubject({
				type: 'agent',
				id: 'agent-1',
				projectId: 'proj-1',
				name: 'Initial Name',
			});
			await vi.waitFor(() =>
				expect(getByTestId('instance-ai-input-context-chip').textContent).toBe('Initial Name'),
			);

			// A rename in the builder mutates the reactive subject's name; the chip
			// must follow it without a re-stash or remount.
			subject!.name = 'Renamed Mid-Session';
			await nextTick();
			expect(getByTestId('instance-ai-input-context-chip').textContent).toBe('Renamed Mid-Session');
		});

		it('falls back to the stashed name when the subject refers to a different agent', async () => {
			const { getByTestId } = mountWithSubject({
				type: 'agent',
				id: 'agent-other',
				projectId: 'proj-1',
				name: 'Renamed Live',
			});
			await vi.waitFor(() =>
				expect(getByTestId('instance-ai-input-context-chip').textContent).toBe('Stashed Name'),
			);
		});

		it('falls back to the stashed name when no subject is provided', async () => {
			const { getByTestId } = mountWithSubject(undefined);
			await vi.waitFor(() =>
				expect(getByTestId('instance-ai-input-context-chip').textContent).toBe('Stashed Name'),
			);
		});
	});

	it('awaits beforeSend before sending, restoring the draft if it rejects', async () => {
		const beforeSend = vi.fn().mockRejectedValueOnce(new Error('flush failed'));
		const renderer = createThreadComponentRenderer(
			InstanceAiConversation,
			{
				props: { beforeSend },
				global: { stubs: { InstanceAiInput: InstanceAiInputStub } },
			},
			() => thread,
		);
		const { getByTestId } = renderer();

		// The stub only passes a `restoreDraft` callback with an attachment queued.
		await fireEvent.click(getByTestId('instance-ai-input-add-attachment'));
		await fireEvent.click(getByTestId('instance-ai-input-submit'));
		await vi.waitFor(() => expect(beforeSend).toHaveBeenCalled());

		expect(thread.sendMessage).not.toHaveBeenCalled();
		expect(getByTestId('instance-ai-input-draft').textContent).toBe('Normal message');
		expect(getByTestId('instance-ai-input-attachments').textContent).toBe('attached');
	});

	it('tracks mention counts only after the backend accepts resource attachments', async () => {
		thread.draftMentions = [
			buildDraftMention(
				{ kind: 'workflow', workflowId: 'workflow-1', workflowName: 'Support triage' },
				'typed',
			),
			buildDraftMention(
				{
					kind: 'node',
					workflowId: 'workflow-1',
					workflowName: 'Support triage',
					node: {
						id: 'node-1',
						name: 'Route request',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
					},
				},
				'button',
			),
			buildDraftMention(
				{
					kind: 'canvas-group',
					workflowId: 'workflow-1',
					workflowName: 'Support triage',
					groupId: 'group-1',
					groupName: 'Handle failures',
					nodes: [
						{
							id: 'node-2',
							name: 'Notify owner',
							type: 'n8n-nodes-base.set',
							typeVersion: 1,
						},
					],
				},
				'button',
			),
		];
		vi.mocked(thread.sendMessage).mockImplementation(async (_message, options) => {
			options.onAcceptedResourceAttachments?.([
				{ type: 'workflow', id: 'workflow-1', name: 'Support triage' },
			]);
			return true;
		});
		const renderer = createThreadComponentRenderer(
			InstanceAiConversation,
			{ global: { stubs: { InstanceAiInput: InstanceAiInputStub } } },
			() => thread,
		);
		const { getByTestId } = renderer();

		await fireEvent.click(getByTestId('instance-ai-input-submit'));
		await vi.waitFor(() =>
			expect(telemetryTrackSpy).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.USER_SENT_CHAT_MESSAGE_WITH_MENTIONS,
				{
					mention_count: 3,
					workflow_count: 1,
					node_count: 1,
					canvas_group_count: 1,
				},
			),
		);
	});

	it('sends the message once beforeSend resolves', async () => {
		let resolveBeforeSend: () => void = () => {};
		const beforeSend = vi.fn(
			async () =>
				await new Promise<void>((resolve) => {
					resolveBeforeSend = resolve;
				}),
		);
		const renderer = createThreadComponentRenderer(
			InstanceAiConversation,
			{
				props: { beforeSend },
				global: { stubs: { InstanceAiInput: InstanceAiInputStub } },
			},
			() => thread,
		);
		const { getByTestId } = renderer();

		await fireEvent.click(getByTestId('instance-ai-input-submit'));
		await vi.waitFor(() => expect(beforeSend).toHaveBeenCalled());

		expect(thread.sendMessage).not.toHaveBeenCalled();

		resolveBeforeSend();
		await vi.waitFor(() => expect(thread.sendMessage).toHaveBeenCalledTimes(1));
		expect(thread.sendMessage).toHaveBeenCalledTimes(1);
	});

	it('does not send once beforeSend resolves if the panel disposed this runtime meanwhile', async () => {
		let resolveBeforeSend: () => void = () => {};
		const beforeSend = vi.fn(
			async () =>
				await new Promise<void>((resolve) => {
					resolveBeforeSend = resolve;
				}),
		);
		const renderer = createThreadComponentRenderer(
			InstanceAiConversation,
			{
				props: { beforeSend },
				global: { stubs: { InstanceAiInput: InstanceAiInputStub } },
			},
			() => thread,
		);
		const { getByTestId } = renderer();

		await fireEvent.click(getByTestId('instance-ai-input-submit'));
		await vi.waitFor(() => expect(beforeSend).toHaveBeenCalled());

		// Simulate the host disposing/replacing the runtime while `beforeSend` was pending.
		const replacementThread = makeThread();
		store.getRuntime.mockReturnValue(replacementThread);
		resolveBeforeSend();

		await vi.waitFor(() => expect(beforeSend).toHaveResolved());
		expect(thread.sendMessage).not.toHaveBeenCalled();
		expect(replacementThread.sendMessage).not.toHaveBeenCalled();
	});

	it('exposes pendingComposerContext for panels beside the conversation', () => {
		const wrapper = mountConversation();
		const conversation = wrapper.findComponent(InstanceAiConversation);
		expect(conversation.vm.pendingComposerContext).toBeNull();
	});

	describe('exposed contract', () => {
		it('exposes isDirty, resetScroll and dismissPendingComposerContext', () => {
			const wrapper = mountConversation();
			const conversation = wrapper.findComponent(InstanceAiConversation);

			expect(typeof conversation.vm.isDirty).toBe('function');
			expect(conversation.vm.isDirty()).toBe(false);
			expect(typeof conversation.vm.resetScroll).toBe('function');
			expect(typeof conversation.vm.dismissPendingComposerContext).toBe('function');
			expect(conversation.vm.dismissPendingComposerContext('missing-key')).toBe(false);
		});

		it('applyHandoff stashes the context and binds the agent-preview-view metadata', () => {
			const wrapper = mountConversation();
			const conversation = wrapper.findComponent(InstanceAiConversation);
			const context: InstanceAiHandoffContext = {
				source: 'agent-preview',
				agentId: 'agent-1',
				threadId: 'preview-1',
			};

			conversation.vm.applyHandoff(context);

			expect(store.updateThreadMetadata).toHaveBeenCalledWith('thread-1', {
				instanceAiAgentPreviewView: { agentId: 'agent-1', threadId: 'preview-1' },
			});
		});
	});

	describe('workflow handoff without opening turn', () => {
		it('restores a pending workflow attachment and shows the static greeting', async () => {
			stashPendingWorkflowAttachment('thread-1', {
				type: 'workflow',
				id: 'wf-1',
				name: 'FAQ Responder',
			});

			const renderer = createThreadComponentRenderer(
				InstanceAiConversation,
				{
					global: { stubs: { InstanceAiInput: InstanceAiInputStub } },
				},
				() => thread,
			);
			const { getByTestId } = renderer();

			await vi.waitFor(() =>
				expect(thread.setPendingWorkflowAttachment).toHaveBeenCalledWith({
					type: 'workflow',
					id: 'wf-1',
					name: 'FAQ Responder',
				}),
			);
			thread.pendingWorkflowAttachment = {
				type: 'workflow',
				id: 'wf-1',
				name: 'FAQ Responder',
			};
			await vi.waitFor(() =>
				expect(getByTestId('instance-ai-workflow-handoff-greeting')).toBeInTheDocument(),
			);
			expect(getByTestId('instance-ai-workflow-handoff-attachment')).toBeInTheDocument();
			expect(getByTestId('attachment-preview-resource')).toHaveTextContent('FAQ Responder');
			expect(getByTestId('instance-ai-workflow-handoff-greeting')).toHaveTextContent(
				'FAQ Responder',
			);
			expect(getByTestId('instance-ai-workflow-handoff-greeting')).toHaveTextContent(
				'make changes, debug an issue, set up credentials',
			);
			expect(getByTestId('instance-ai-input-context-chip')).toHaveTextContent('FAQ Responder');
			expect(thread.sendMessage).not.toHaveBeenCalled();
			expect(handleRedirectLandingSpy).not.toHaveBeenCalled();
		});

		it('restores a pending workflow attachment before loadThread resolves', async () => {
			store.threads = [];
			let resolveLoad!: () => void;
			store.loadThread.mockReturnValue(
				new Promise<void>((resolve) => {
					resolveLoad = resolve;
				}),
			);
			stashPendingWorkflowAttachment('thread-1', {
				type: 'workflow',
				id: 'wf-1',
				name: 'FAQ Responder',
			});

			const renderer = createThreadComponentRenderer(
				InstanceAiConversation,
				{
					global: { stubs: { InstanceAiInput: InstanceAiInputStub } },
				},
				() => thread,
			);
			renderer();

			await vi.waitFor(() =>
				expect(thread.setPendingWorkflowAttachment).toHaveBeenCalledWith({
					type: 'workflow',
					id: 'wf-1',
					name: 'FAQ Responder',
				}),
			);
			expect(store.loadThread).toHaveBeenCalledWith('thread-1');
			resolveLoad();
		});

		it('fires the workflow-list auto landing handler once on hydration', async () => {
			thread.sseState = 'disconnected';
			stashPendingWorkflowAttachment('thread-1', {
				type: 'workflow',
				id: 'wf-1',
				name: 'FAQ Responder',
			});
			stashPendingRedirectLanding('thread-1');

			const renderer = createThreadComponentRenderer(
				InstanceAiConversation,
				{
					global: { stubs: { InstanceAiInput: InstanceAiInputStub } },
				},
				() => thread,
			);
			renderer();

			await vi.waitFor(() => expect(handleRedirectLandingSpy).toHaveBeenCalledWith('thread-1'));
			expect(thread.sendMessage).not.toHaveBeenCalled();
		});

		it('appends the pending workflow attachment on first submit and clears it', async () => {
			thread.pendingWorkflowAttachment = {
				type: 'workflow',
				id: 'wf-1',
				name: 'FAQ Responder',
			};
			const renderer = createThreadComponentRenderer(
				InstanceAiConversation,
				{
					global: { stubs: { InstanceAiInput: InstanceAiInputStub } },
				},
				() => thread,
			);
			const { getByTestId } = renderer();

			await fireEvent.click(getByTestId('instance-ai-input-submit'));
			await vi.waitFor(() => expect(thread.sendMessage).toHaveBeenCalled());

			expect(thread.sendMessage).toHaveBeenCalledWith(
				'Normal message',
				expect.objectContaining({
					authorship: USER_TYPED_MESSAGE,
					attachments: [{ type: 'workflow', id: 'wf-1', name: 'FAQ Responder' }],
				}),
			);
			await vi.waitFor(() => expect(thread.clearPendingWorkflowAttachment).toHaveBeenCalled());
			expect(thread.pendingWorkflowAttachment).toBeNull();
		});

		it('clears the workflow hand-off stash after send even if the runtime already dropped it', async () => {
			stashPendingWorkflowAttachment('thread-1', {
				type: 'workflow',
				id: 'wf-1',
				name: 'FAQ Responder',
			});
			thread.pendingWorkflowAttachment = {
				type: 'workflow',
				id: 'wf-1',
				name: 'FAQ Responder',
			};
			let resolveSend!: (value: boolean) => void;
			vi.mocked(thread.sendMessage).mockReturnValueOnce(
				new Promise((resolve) => {
					resolveSend = resolve;
				}),
			);
			const renderer = createThreadComponentRenderer(
				InstanceAiConversation,
				{
					global: { stubs: { InstanceAiInput: InstanceAiInputStub } },
				},
				() => thread,
			);
			const { getByTestId } = renderer();

			await fireEvent.click(getByTestId('instance-ai-input-submit'));
			await vi.waitFor(() => expect(thread.sendMessage).toHaveBeenCalled());
			thread.pendingWorkflowAttachment = null;

			resolveSend(true);
			await vi.waitFor(() => expect(getPendingWorkflowAttachment('thread-1')).toBeNull());
		});

		it('clears the pending workflow attachment when the context chip is dismissed', async () => {
			thread.pendingWorkflowAttachment = {
				type: 'workflow',
				id: 'wf-1',
				name: 'FAQ Responder',
			};
			const renderer = createThreadComponentRenderer(
				InstanceAiConversation,
				{
					global: { stubs: { InstanceAiInput: InstanceAiInputStub } },
				},
				() => thread,
			);
			const { getByTestId } = renderer();

			expect(getByTestId('instance-ai-input-context-chip')).toHaveTextContent('FAQ Responder');
			await fireEvent.click(getByTestId('instance-ai-input-dismiss-context-chip'));
			await vi.waitFor(() => expect(thread.clearPendingWorkflowAttachment).toHaveBeenCalled());
			expect(thread.pendingWorkflowAttachment).toBeNull();
		});
	});
});
