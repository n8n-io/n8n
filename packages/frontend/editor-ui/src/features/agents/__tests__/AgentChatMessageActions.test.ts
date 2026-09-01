import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AgentChatMessageActions from '../components/AgentChatMessageActions.vue';

vi.mock('@n8n/design-system', () => ({
	N8nIconButton: {
		template:
			'<button :data-test-id="$attrs[\'data-test-id\']" @click="$emit(\'click\')"><slot /></button>',
		emits: ['click'],
	},
	N8nTooltip: { template: '<div><slot /><slot name="content" /></div>' },
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

vi.mock('@/features/ai/chatHub/components/CopyButton.vue', () => ({
	default: {
		template: '<button data-test-id="agent-chat-message-copy">copy</button>',
		props: ['content'],
	},
}));

describe('AgentChatMessageActions', () => {
	it('renders send-to-assistant only when enabled and emits on click', async () => {
		const wrapper = mount(AgentChatMessageActions, {
			props: {
				content: 'Agent reply',
				isSpeechSynthesisAvailable: false,
				isSpeaking: false,
				canSendToAssistant: true,
			},
		});

		expect(wrapper.find('[data-test-id="agent-chat-message-send-to-assistant"]').exists()).toBe(
			true,
		);

		await wrapper.find('[data-test-id="agent-chat-message-send-to-assistant"]').trigger('click');

		expect(wrapper.emitted('sendToAssistant')).toHaveLength(1);
	});

	it('does not render send-to-assistant when disabled', () => {
		const wrapper = mount(AgentChatMessageActions, {
			props: {
				content: 'Agent reply',
				isSpeechSynthesisAvailable: false,
				isSpeaking: false,
				canSendToAssistant: false,
			},
		});

		expect(wrapper.find('[data-test-id="agent-chat-message-send-to-assistant"]').exists()).toBe(
			false,
		);
	});
});
