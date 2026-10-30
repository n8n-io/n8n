import { createTestingPinia } from '@pinia/testing';
import { mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AgentPreviewChatPage from '../components/AgentPreviewChatPage.vue';

const { flagEnabled, sendMessageFromOutside } = vi.hoisted(() => ({
	flagEnabled: { value: false },
	sendMessageFromOutside: vi.fn(),
}));

vi.mock('../composables/useTestAgentPreviewFlag', () => ({
	useTestAgentPreviewFlag: () => ({ isFeatureEnabled: ref(flagEnabled.value) }),
}));

// The panel renders whatever the page puts in its slots, for one reply with an
// execution id and one without.
const AgentChatPanelStub = defineComponent({
	name: 'AgentChatPanel',
	setup(_, { slots, expose }) {
		expose({ sendMessageFromOutside, focusInput: vi.fn() });
		return () =>
			h('div', [
				h('div', { 'data-test-id': 'empty' }, slots['empty-state']?.()),
				h(
					'div',
					{ 'data-test-id': 'review-with-id' },
					slots['message-review']?.({ message: { id: 'a-1' }, executionId: 'exec-1' }),
				),
				h(
					'div',
					{ 'data-test-id': 'review-without-id' },
					slots['message-review']?.({ message: { id: 'a-2' } }),
				),
			]);
	},
});

const IdeasStub = defineComponent({
	name: 'AgentTestChatIdeas',
	props: { projectId: String, agentId: String },
	emits: ['select'],
	setup:
		(_props, { emit }) =>
		() =>
			h('button', { 'data-test-id': 'ideas', onClick: () => emit('select', 'Where is my order?') }),
});

const ReviewStub = defineComponent({
	name: 'AgentTestReplyReview',
	props: { projectId: String, agentId: String, threadId: String, executionId: String },
	setup: (props) => () =>
		h('div', {
			'data-test-id': 'review',
			'data-thread-id': props.threadId,
			'data-execution-id': props.executionId,
		}),
});

function render() {
	return mount(AgentPreviewChatPage, {
		props: {
			initialized: true,
			projectId: 'project-1',
			agentId: 'agent-1',
			agent: null,
			localConfig: { name: 'Order help desk' } as never,
			connectedTriggers: [],
			effectiveSessionId: 'thread-1',
		},
		global: {
			plugins: [createTestingPinia()],
			stubs: {
				AgentChatPanel: AgentChatPanelStub,
				AgentChatEmptyState: { template: '<div data-test-id="default-empty"><slot /></div>' },
				AgentTestChatIdeas: IdeasStub,
				AgentTestReplyReview: ReviewStub,
			},
		},
	});
}

describe('AgentPreviewChatPage', () => {
	beforeEach(() => {
		sendMessageFromOutside.mockReset();
	});

	describe('with agent evals off', () => {
		beforeEach(() => {
			flagEnabled.value = false;
		});

		it('adds no ideas and no review', () => {
			const wrapper = render();

			expect(wrapper.find('[data-test-id="ideas"]').exists()).toBe(false);
			expect(wrapper.find('[data-test-id="review"]').exists()).toBe(false);
		});
	});

	describe('with agent evals on', () => {
		beforeEach(() => {
			flagEnabled.value = true;
		});

		it('keeps the usual empty state and adds the ideas to it', () => {
			const wrapper = render();

			expect(wrapper.find('[data-test-id="default-empty"] [data-test-id="ideas"]').exists()).toBe(
				true,
			);
		});

		it('sends the idea the person picks', async () => {
			const wrapper = render();

			await wrapper.find('[data-test-id="ideas"]').trigger('click');

			expect(sendMessageFromOutside).toHaveBeenCalledWith('Where is my order?');
		});

		it('adds the review under a reply, for this chat and its execution', () => {
			const wrapper = render();

			const review = wrapper.find('[data-test-id="review-with-id"] [data-test-id="review"]');
			expect(review.attributes('data-thread-id')).toBe('thread-1');
			expect(review.attributes('data-execution-id')).toBe('exec-1');
		});

		it('adds no review under a reply with no execution id', () => {
			const wrapper = render();

			expect(
				wrapper.find('[data-test-id="review-without-id"] [data-test-id="review"]').exists(),
			).toBe(false);
		});
	});
});
