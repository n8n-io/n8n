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
import { stashPendingAgentAttachment } from '../../composables/useInstanceAiHandoff';
import type { InstanceAiEmbedSubject } from '../../embed/instanceAiEmbed.types';
import type { InstanceAiHandoffContext, InstanceAiMessage } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';

const telemetryTrackSpy = vi.hoisted(() => vi.fn());
const showMessageSpy = vi.hoisted(() => vi.fn());
const showErrorSpy = vi.hoisted(() => vi.fn());

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: telemetryTrackSpy }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: showErrorSpy, showMessage: showMessageSpy }),
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

	it('emits agent-attachment-restored when a pending attachment is restored on hydration', async () => {
		thread.sseState = 'disconnected';
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
		function mountWithSubject(subject: InstanceAiEmbedSubject | undefined) {
			thread.sseState = 'disconnected';
			stashPendingAgentAttachment('thread-1', {
				type: 'agent',
				id: 'agent-1',
				projectId: 'proj-1',
				name: 'Stashed Name',
				pending: true,
			});
			const renderer = createThreadComponentRenderer(
				InstanceAiConversation,
				{
					props: { subject },
					global: { stubs: { InstanceAiInput: InstanceAiInputStub } },
				},
				() => thread,
			);
			return renderer();
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
});
