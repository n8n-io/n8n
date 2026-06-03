import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AgentChatMessageList from '../components/AgentChatMessageList.vue';
import type { ChatMessage } from '../composables/agentChatMessages';

const copySpy = vi.fn();

vi.mock('@n8n/design-system', () => ({
	N8nIcon: { template: '<i />' },
	N8nIconButton: {
		template:
			'<button :data-test-id="$attrs[\'data-test-id\']" @click="$emit(\'click\')">{{ icon }}</button>',
		props: ['icon'],
		emits: ['click'],
	},
	N8nTooltip: { template: '<div><slot /><slot name="content" /></div>' },
}));

vi.mock('@/features/ai/chatHub/components/ChatMarkdownChunk.vue', () => ({
	default: { template: '<div>{{ source.content }}</div>', props: ['source'] },
}));

vi.mock('@/features/ai/chatHub/components/ChatTypingIndicator.vue', () => ({
	default: { template: '<div data-test-id="typing-indicator" />' },
}));

vi.mock('@/features/agents/components/AgentChatToolSteps.vue', () => ({
	default: { template: '<div />', props: ['toolCalls', 'projectId'] },
}));

vi.mock('@/features/agents/components/interactive/InteractiveCard.vue', () => ({
	default: { template: '<div />', props: ['payload', 'projectId', 'agentId'] },
}));

vi.mock('@/features/ai/chatHub/components/CopyButton.vue', () => ({
	default: {
		template:
			'<button data-test-id="agent-chat-message-copy" @click="copySpy(content)">copy</button>',
		props: ['content'],
		setup() {
			return { copySpy };
		},
	},
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

describe('AgentChatMessageList', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('shows copy and read-aloud actions for assistant text messages', async () => {
		const speakSpy = vi.spyOn(window.speechSynthesis, 'speak');
		const cancelSpy = vi.spyOn(window.speechSynthesis, 'cancel');

		const wrapper = mount(AgentChatMessageList, {
			props: {
				messages: [
					{
						id: 'assistant-1',
						role: 'assistant',
						content: 'Agent reply',
						status: 'success',
					} satisfies ChatMessage,
				],
				messagingState: 'idle',
			},
		});

		expect(wrapper.find('[data-test-id="agent-chat-message-actions"]').exists()).toBe(true);
		expect(wrapper.find('[data-test-id="agent-chat-message-copy"]').exists()).toBe(true);
		expect(wrapper.find('[data-test-id="agent-chat-message-read-aloud"]').exists()).toBe(true);

		await wrapper.find('[data-test-id="agent-chat-message-read-aloud"]').trigger('click');
		expect(cancelSpy).toHaveBeenCalled();
		expect(speakSpy).toHaveBeenCalledTimes(1);
	});

	it('does not render actions for user text messages', () => {
		const wrapper = mount(AgentChatMessageList, {
			props: {
				messages: [
					{
						id: 'user-1',
						role: 'user',
						content: 'User prompt',
						status: 'success',
					} satisfies ChatMessage,
				],
				messagingState: 'idle',
			},
		});

		expect(wrapper.find('[data-test-id="agent-chat-message-actions"]').exists()).toBe(false);
		expect(wrapper.find('[data-test-id="agent-chat-message-read-aloud"]').exists()).toBe(false);
	});

	it('shows a single action row for consecutive assistant messages and copies the whole run', async () => {
		const wrapper = mount(AgentChatMessageList, {
			props: {
				messages: [
					{
						id: 'assistant-1',
						role: 'assistant',
						content: 'First reply',
						status: 'success',
					} satisfies ChatMessage,
					{
						id: 'assistant-2',
						role: 'assistant',
						content: 'Second reply',
						status: 'success',
					} satisfies ChatMessage,
					{
						id: 'user-1',
						role: 'user',
						content: 'Next prompt',
						status: 'success',
					} satisfies ChatMessage,
				],
				messagingState: 'idle',
			},
		});

		expect(wrapper.findAll('[data-test-id="agent-chat-message-actions"]')).toHaveLength(1);

		await wrapper.find('[data-test-id="agent-chat-message-copy"]').trigger('click');
		await flushPromises();
		expect(copySpy).toHaveBeenCalledWith('First reply\n\nSecond reply');
	});
});
