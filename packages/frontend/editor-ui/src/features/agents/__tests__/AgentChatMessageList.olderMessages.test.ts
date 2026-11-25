import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import AgentChatMessageList from '../components/AgentChatMessageList.vue';
import type { ChatMessage } from '@/features/ai/shared/agentsChat/types';

/**
 * The scroll position and the load trigger belong to `N8nChatScrollArea`.
 * These tests cover only what the list shows for older messages.
 */

vi.mock('@/features/agents/components/AgentChatMessageActions.vue', () => ({
	default: { template: '<div />' },
}));

vi.mock('@/features/agents/components/AgentMarkdownChunk.vue', () => ({
	default: { props: ['source'], template: '<div>{{ source }}</div>' },
}));

function message(id: string, role: ChatMessage['role'], createdAt?: number): ChatMessage {
	return { id, role, content: `${role} ${id}`, status: 'success', createdAt };
}

describe('AgentChatMessageList older messages', () => {
	it('shows the first timestamp divider only when no older messages are left', async () => {
		const now = Date.now();
		const newest = [message('u2', 'user', now), message('a2', 'assistant', now)];
		const wrapper = mount(AgentChatMessageList, {
			props: { messages: newest, messagingState: 'idle', hasOlderMessages: true },
		});
		await flushPromises();
		const dividers = () => wrapper.findAll('[data-testid="agent-chat-timestamp-divider"]');
		/** The gap to the turn before is not known yet. */
		expect(dividers()).toHaveLength(0);

		/** The last page, two minutes before: only the new first turn gets a divider. */
		await wrapper.setProps({
			messages: [
				message('u1', 'user', now - 2 * 60_000),
				message('a1', 'assistant', now - 2 * 60_000),
				...newest,
			],
			hasOlderMessages: false,
		});

		expect(dividers()).toHaveLength(1);
		expect(wrapper.element.firstElementChild).toBe(dividers()[0].element);
	});

	it('shows a spinner while older messages load', () => {
		const wrapper = mount(AgentChatMessageList, {
			props: {
				messages: [message('u1', 'user')],
				messagingState: 'idle',
				hasOlderMessages: true,
				loadingOlderMessages: true,
			},
		});

		expect(wrapper.find('[data-testid="agent-chat-older-messages-loading"]').exists()).toBe(true);
	});

	it('shows a retry after a failed load and emits the retry', async () => {
		const wrapper = mount(AgentChatMessageList, {
			props: {
				messages: [message('u1', 'user')],
				messagingState: 'idle',
				hasOlderMessages: true,
				loadOlderMessagesFailed: true,
			},
		});

		const error = wrapper.find('[data-testid="agent-chat-older-messages-error"]');
		expect(error.exists()).toBe(true);
		expect(error.attributes('role')).toBe('alert');

		await error.find('button').trigger('click');

		expect(wrapper.emitted('retry-load-older')).toHaveLength(1);
	});
});
