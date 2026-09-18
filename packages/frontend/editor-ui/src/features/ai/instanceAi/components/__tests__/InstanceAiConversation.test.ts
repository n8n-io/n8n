import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
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
	makeThread,
} from '../../__tests__/createThreadComponentRenderer';
import InstanceAiConversation from '../InstanceAiConversation.vue';
import { provideThread, useInstanceAiStore, type ThreadRuntime } from '../../instanceAi.store';
import {
	getPendingWorkflowAttachment,
	stashPendingAgentAttachment,
	stashPendingRedirectLanding,
	stashPendingWorkflowAttachment,
} from '../../composables/useInstanceAiHandoff';
import type { InstanceAiHandoffContext, InstanceAiMessage } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { USER_TYPED_MESSAGE } from '../../prefills';

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

	describe('queued messages', () => {
		const queued = (id: string, text: string) => ({
			id,
			text,
			createdAt: '2026-04-01T00:00:00.000Z',
		});

		function renderWithQueue() {
			return createThreadComponentRenderer(
				InstanceAiConversation,
				{ global: { stubs: { InstanceAiInput: InstanceAiInputStub } } },
				() => thread,
			);
		}

		it('queues the submitted message while a run is active instead of sending it', async () => {
			thread.isStreaming = true;
			const { getByTestId } = renderWithQueue()();

			await fireEvent.click(getByTestId('instance-ai-input-submit'));

			await vi.waitFor(() => expect(thread.queueMessage).toHaveBeenCalledWith('Normal message'));
			expect(thread.sendMessage).not.toHaveBeenCalled();
		});

		it('restores the draft when the queue write is refused', async () => {
			thread.isStreaming = true;
			vi.mocked(thread.queueMessage).mockResolvedValue(false);
			const { getByTestId } = renderWithQueue()();

			await fireEvent.click(getByTestId('instance-ai-input-submit'));

			await vi.waitFor(() =>
				expect(getByTestId('instance-ai-input-draft').textContent).toBe('Normal message'),
			);
		});

		it('sends a recall back into the composer', async () => {
			thread.queuedMessages = [queued('qm-1', 'Use the Slack node')];
			vi.mocked(thread.takeQueuedMessageForEdit).mockResolvedValue('Use the Slack node');
			const { getByTestId } = renderWithQueue()();

			await fireEvent.click(getByTestId('instance-ai-queued-message-edit'));

			await vi.waitFor(() =>
				expect(getByTestId('instance-ai-input-draft').textContent).toBe('Use the Slack node'),
			);
		});

		it('sends the whole queue now, and removes one item', async () => {
			thread.isStreaming = true;
			thread.queuedMessages = [queued('qm-1', 'Use the Slack node'), queued('qm-2', 'And log')];
			const { getByTestId, getAllByTestId } = renderWithQueue()();

			expect(getByTestId('instance-ai-queued-messages-count').textContent).toContain('2 of 5');
			// Send now sits on every row and sends the whole queue.
			await fireEvent.click(getAllByTestId('instance-ai-queued-message-send-now')[1]);
			await fireEvent.click(getAllByTestId('instance-ai-queued-message-remove')[1]);

			await vi.waitFor(() => expect(thread.sendQueueNow).toHaveBeenCalledTimes(1));
			await vi.waitFor(() => expect(thread.removeQueuedMessage).toHaveBeenCalledWith('qm-2'));
		});

		it('still offers Send now on an idle thread, for a queue a Stop left behind', async () => {
			thread.isStreaming = false;
			thread.queuedMessages = [queued('qm-1', 'Use the Slack node')];
			const { getByTestId } = renderWithQueue()();

			await fireEvent.click(getByTestId('instance-ai-queued-message-send-now'));

			await vi.waitFor(() => expect(thread.sendQueueNow).toHaveBeenCalledTimes(1));
		});

		it('says so at five', () => {
			thread.isStreaming = true;
			thread.queuedMessages = ['one', 'two', 'three', 'four', 'five'].map((text, index) =>
				queued(`qm-${index}`, text),
			);
			const { getByTestId } = renderWithQueue()();

			expect(getByTestId('instance-ai-queued-messages-count').textContent).toContain('5 of 5');
			expect(getByTestId('instance-ai-queued-messages-full')).toBeInTheDocument();
		});

		it('drops an item from the list once it was sent now', () => {
			thread.isStreaming = true;
			thread.queuedMessages = [
				{ ...queued('qm-1', 'Use the Slack node'), sentAt: '2026-04-01T00:00:01.000Z' },
				queued('qm-2', 'And add a filter'),
			];
			const { getAllByTestId } = renderWithQueue()();

			const items = getAllByTestId('instance-ai-queued-message');
			expect(items).toHaveLength(1);
			expect(items[0].textContent).toContain('And add a filter');
		});

		it('hides the queue while an approval card owns the interaction', () => {
			thread.isAwaitingConfirmation = true;
			thread.queuedMessages = [queued('qm-1', 'Use the Slack node')];
			const { queryByTestId } = renderWithQueue()();

			expect(queryByTestId('instance-ai-queued-messages')).not.toBeInTheDocument();
		});

		it('hides the queue while a plan review owns the interaction', () => {
			thread.pendingPlanReview = { requestId: 'req-1', taskCount: 2 };
			thread.queuedMessages = [queued('qm-1', 'Use the Slack node')];
			const { queryByTestId } = renderWithQueue()();

			expect(queryByTestId('instance-ai-queued-messages')).not.toBeInTheDocument();
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
