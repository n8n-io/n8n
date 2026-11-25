import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { h } from 'vue';
import AgentChatMessageList from '../components/AgentChatMessageList.vue';
import type { ChatMessage, ToolCall } from '@/features/ai/shared/agentsChat/types';

vi.mock('@/features/agents/components/AgentChatMessageActions.vue', () => ({
	default: { template: '<div />' },
}));

vi.mock('@/features/agents/components/AgentMarkdownChunk.vue', () => ({
	default: { props: ['source'], template: '<div>{{ source }}</div>' },
}));

function heldToolCall(toolCallId: string, state: ToolCall['state'] = 'done'): ToolCall {
	return {
		tool: 'slack__post_message',
		toolCallId,
		input: { channel: '#ops' },
		state,
		simulation: { route: 'simulated', reason: 'served_from_world', evidence: ['world_write'] },
	};
}

function reply(status: ChatMessage['status'], toolCalls: ToolCall[]): ChatMessage[] {
	return [
		{ id: 'u1', role: 'user', content: 'Tell the team', status: 'success' },
		{ id: 'a1', role: 'assistant', content: '', status, toolCalls },
	];
}

type MessagingState = 'idle' | 'waitingFirstChunk' | 'receiving';

function mountList(messages: ChatMessage[], messagingState: MessagingState) {
	return mount(AgentChatMessageList, {
		props: { messages, messagingState },
		slots: {
			'after-reply': (slotProps: { toolCalls: ToolCall[]; complete: boolean }) =>
				h('div', {
					'data-testid': 'after-reply',
					'data-complete': String(slotProps.complete),
					'data-count': String(slotProps.toolCalls.length),
				}),
		},
	});
}

describe('AgentChatMessageList after-reply slot', () => {
	it('reports the reply as not complete until the run ends', async () => {
		const wrapper = mountList(reply('streaming', [heldToolCall('call-1')]), 'receiving');
		await flushPromises();

		const slot = () => wrapper.get('[data-testid="after-reply"]');
		/** The first held call is done, but the run can still add another one. */
		expect(slot().attributes('data-complete')).toBe('false');

		await wrapper.setProps({
			messages: reply('success', [heldToolCall('call-1'), heldToolCall('call-2')]),
			messagingState: 'idle',
		});

		expect(slot().attributes('data-count')).toBe('2');
		expect(slot().attributes('data-complete')).toBe('true');
	});

	it('reports the reply as not complete while one of its tool calls waits', async () => {
		const wrapper = mountList(
			reply('awaitingUser', [heldToolCall('call-1'), heldToolCall('call-2', 'suspended')]),
			'idle',
		);
		await flushPromises();

		expect(wrapper.get('[data-testid="after-reply"]').attributes('data-complete')).toBe('false');
	});

	it('reports an earlier reply as complete while a later reply streams', async () => {
		const wrapper = mountList(
			[
				...reply('success', [heldToolCall('call-1')]),
				{ id: 'u2', role: 'user', content: 'Again', status: 'success' },
				{ id: 'a2', role: 'assistant', content: '', status: 'streaming' },
			],
			'receiving',
		);
		await flushPromises();

		const slots = wrapper.findAll('[data-testid="after-reply"]');
		expect(slots).toHaveLength(1);
		expect(slots[0].attributes('data-complete')).toBe('true');
	});
});
