import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, provide, reactive } from 'vue';
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
import type { InstanceAiEmbedSubject } from '../../embed/instanceAiEmbed.types';
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
	function mountConversation(
		props: { mentionsEnabled?: boolean } = {},
		openWorkflowPreview = vi.fn(),
	) {
		const Host = defineComponent({
			setup() {
				provideThread(thread);
				provide('openWorkflowPreview', openWorkflowPreview);
				return () => h(InstanceAiConversation, props);
			},
		});
		return mount(Host, { global: { stubs: { InstanceAiInput: InstanceAiInputStub } } });
	}

	it('routes mention references and workflow opening through the thread host', async () => {
		thread.producedArtifacts.set('wf-1', {
			type: 'workflow',
			id: 'wf-1',
			name: 'Orders',
		});
		const openWorkflowPreview = vi.fn();
		const wrapper = mountConversation({ mentionsEnabled: true }, openWorkflowPreview);
		const input = wrapper.findComponent(InstanceAiInputStub);
		const reference = {
			referenceId: 'draft-1',
			workflowId: 'wf-1',
			workflowName: 'Orders',
		};

		input.vm.$emit('mention-reference-added', reference);
		input.vm.$emit('mention-workflow-open', 'wf-1');
		await nextTick();

		expect(thread.upsertTransientWorkflowReference).toHaveBeenCalledWith({
			...reference,
			projectId: 'thread-project',
		});
		expect(thread.transientWorkflowReferences.get('draft-1')).toMatchObject(reference);
		expect(openWorkflowPreview).toHaveBeenCalledWith('wf-1');
		expect(input.props('mentionArtifacts')).toEqual([{ id: 'wf-1', name: 'Orders' }]);

		input.vm.$emit('mention-reference-removed', 'draft-1');
		expect(thread.removeTransientWorkflowReference).toHaveBeenCalledWith('draft-1');
		expect(thread.transientWorkflowReferences.has('draft-1')).toBe(false);
	});

	it('accepts the submitted mention draft only after the message is admitted', async () => {
		const wrapper = mountConversation();
		const input = wrapper.findComponent(InstanceAiInputStub);
		const acceptDraft = vi.fn();
		let admit!: (sent: boolean) => void;
		vi.mocked(thread.sendMessage).mockReturnValueOnce(
			new Promise<boolean>((resolve) => {
				admit = resolve;
			}),
		);

		input.vm.$emit(
			'submit',
			'Compare orders',
			[{ type: 'workflow', id: 'wf-1', name: 'Orders' }],
			vi.fn(),
			USER_TYPED_MESSAGE,
			Date.now(),
			acceptDraft,
			{
				total: 1,
				workflow: 1,
				node: 0,
				group: 0,
			},
		);
		await vi.waitFor(() => expect(thread.sendMessage).toHaveBeenCalled());
		expect(thread.sendMessage).toHaveBeenCalledWith(
			'Compare orders',
			expect.objectContaining({
				mentionCounts: {
					total: 1,
					workflow: 1,
					node: 0,
					group: 0,
				},
			}),
		);
		expect(acceptDraft).not.toHaveBeenCalled();

		admit(true);
		await vi.waitFor(() => expect(acceptDraft).toHaveBeenCalledOnce());
	});

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
