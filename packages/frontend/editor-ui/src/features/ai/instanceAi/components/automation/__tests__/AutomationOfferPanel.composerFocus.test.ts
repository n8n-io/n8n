import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { createMemoryHistory, createRouter } from 'vue-router';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import AgentChatPanel from '@/features/agents/components/AgentChatPanel.vue';
import AutomationOfferPanel from '../AutomationOfferPanel.vue';

// The real chat panel and composer, so the composer textarea really is
// disabled while the send prepares. Only the stream and its neighbours are fakes.

const { sendMessage } = vi.hoisted(() => ({ sendMessage: vi.fn() }));

vi.mock('@/features/agents/composables/useAgentChatStream', async () => {
	const vue = await import('vue');
	return {
		useAgentChatStream: () => ({
			messages: vue.ref([]),
			isStreaming: vue.ref(false),
			isSubmitting: vue.ref(false),
			isLoadingHistory: vue.ref(false),
			queuedMessages: vue.ref([]),
			removingQueueIds: vue.ref(new Set()),
			steeringQueueIds: vue.ref(new Set()),
			canSteer: vue.ref(false),
			steerQueuedMessage: vi.fn(),
			removeQueuedMessage: vi.fn(),
			updateQueuedMessage: vi.fn(),
			reorderQueuedMessage: vi.fn(),
			isReorderingQueue: vue.ref(false),
			isCancelling: vue.ref(false),
			messagingState: vue.computed(() => 'idle'),
			fatalError: vue.ref(null),
			loadHistory: vi.fn(),
			refresh: vi.fn(),
			sendMessage,
			stopGenerating: vi.fn(),
			detachStream: vi.fn(),
			resume: vi.fn(),
			cancelAndSteer: vi.fn(),
			dismissFatalError: vi.fn(),
			clearBudgetNotices: vi.fn(),
		}),
	};
});

vi.mock('@/features/agents/composables/useAgentBackgroundJobs', async () => {
	const vue = await import('vue');
	return {
		useAgentBackgroundJobs: () => ({
			jobs: vue.ref([]),
			respondToApproval: vi.fn(),
			stopAll: vi.fn(),
			isStopping: vue.ref(false),
		}),
	};
});

vi.mock('@/features/agents/composables/useAgentTelemetry', () => ({
	useAgentTelemetry: () => ({ trackSubmittedMessage: vi.fn() }),
}));

vi.mock('@/features/agents/components/AgentChatMessageList.vue', () => ({
	default: { name: 'AgentChatMessageList', template: '<div />' },
}));

vi.mock('@/features/agents/components/AgentChatEmptyState.vue', () => ({
	default: { template: '<div />' },
}));

const PROMPT = 'Make "Daily report" automatic';

/**
 * The inline offer as the thread view wires it: a choice hides the offer, asks
 * for the composer focus on the next tick, and "Make it automatic" sends the
 * prompt through the chat.
 */
const OfferInChat = defineComponent({
	setup() {
		const panel = ref<InstanceType<typeof AgentChatPanel>>();
		const isOfferShown = ref(true);

		function settle(prompt?: string) {
			isOfferShown.value = false;
			void nextTick(() => panel.value?.focusInput());
			if (prompt) void panel.value?.sendMessageFromOutside(prompt);
		}

		return () =>
			h(
				AgentChatPanel,
				{
					ref: panel,
					projectId: 'project-1',
					agentId: 'agent-1',
					continueSessionId: 'thread-1',
					agentConfig: null,
					agentStatus: 'draft',
					connectedTriggers: [],
					mode: 'inline',
				},
				{
					'inline-offers': () =>
						isOfferShown.value
							? h(AutomationOfferPanel, {
									workflowName: 'Daily report',
									onAccept: () => settle(PROMPT),
									onDismiss: () => settle(),
								})
							: null,
				},
			);
	},
});

let wrapper: VueWrapper | undefined;

async function mountOfferInChat() {
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [{ path: '/', component: { template: '<div />' } }],
	});
	await router.push('/');
	wrapper = mount(OfferInChat, {
		attachTo: document.body,
		global: { plugins: [createTestingPinia(), router] },
	});
	await flushPromises();
	return wrapper;
}

function composerTextarea(): HTMLTextAreaElement {
	const textarea = wrapper?.find<HTMLTextAreaElement>('textarea');
	if (!textarea?.exists()) throw new Error('The composer is not rendered');
	return textarea.element;
}

describe('AutomationOfferPanel in the chat', () => {
	beforeEach(() => {
		sendMessage.mockReset();
	});

	afterEach(() => {
		wrapper?.unmount();
		wrapper = undefined;
	});

	it('moves the focus to the composer after "Make it automatic"', async () => {
		const sent = createDeferredPromise<'sent'>();
		sendMessage.mockImplementation(
			async (_text: string, _files: unknown, onAccepted: () => void) => {
				await sent.promise;
				onAccepted();
				return 'sent';
			},
		);
		const user = userEvent.setup();
		const chat = await mountOfferInChat();
		chat.get<HTMLButtonElement>('[data-test-id="automation-offer-accept"]').element.focus();

		await user.keyboard('{Enter}');
		await flushPromises();

		expect(sendMessage).toHaveBeenCalledWith(PROMPT, undefined, expect.any(Function));
		expect(chat.find('[data-test-id="automation-offer-panel"]').exists()).toBe(false);
		sent.resolve('sent');
		await flushPromises();

		expect(composerTextarea().disabled).toBe(false);
		expect(document.activeElement).toBe(composerTextarea());
	});

	it('moves the focus to the composer after Dismiss', async () => {
		const user = userEvent.setup();
		const chat = await mountOfferInChat();
		chat.get<HTMLButtonElement>('[data-test-id="automation-offer-dismiss"]').element.focus();

		await user.keyboard('{Enter}');
		await flushPromises();

		expect(chat.find('[data-test-id="automation-offer-panel"]').exists()).toBe(false);
		expect(sendMessage).not.toHaveBeenCalled();
		expect(document.activeElement).toBe(composerTextarea());
	});
});
