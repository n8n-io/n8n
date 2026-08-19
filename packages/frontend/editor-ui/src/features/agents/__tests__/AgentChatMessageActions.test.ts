import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AgentChatMessageActions from '../components/AgentChatMessageActions.vue';

const copySpy = vi.fn();

vi.mock('@n8n/composables/useClipboard', () => ({
	useClipboard: function useClipboard() {
		return { copy: copySpy };
	},
}));

vi.mock('@n8n/design-system', () => ({
	N8nChatActions: {
		props: ['showReadAloud', 'readAloudLabel', 'stopReadingLabel', 'isReadingAloud', 'copyLabel'],
		emits: ['copy', 'readAloud'],
		template: `<div v-bind="$attrs">
			<button data-test-id="agent-chat-message-copy" @click="$emit('copy')">{{ copyLabel }}</button>
			<button
				v-if="showReadAloud"
				data-test-id="agent-chat-message-read-aloud"
				:aria-label="isReadingAloud ? stopReadingLabel : readAloudLabel"
				:aria-pressed="isReadingAloud"
				@click="$emit('readAloud')"
			/>
			<slot />
		</div>`,
	},
	N8nIconButton: {
		template:
			'<button :data-test-id="$attrs[\'data-test-id\']" :aria-label="$attrs[\'aria-label\']" @click="$emit(\'click\')"><slot /></button>',
		emits: ['click'],
	},
	N8nTooltip: { template: '<div><slot /><slot name="content" /></div>' },
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: function useI18n() {
		return {
			baseText: function baseText(key: string) {
				return key;
			},
		};
	},
}));

describe('AgentChatMessageActions', () => {
	beforeEach(function resetMocks() {
		vi.clearAllMocks();
	});

	it('copies the supplied assistant run content', async () => {
		const wrapper = mount(AgentChatMessageActions, {
			props: {
				content: 'First reply\n\nSecond reply',
				isSpeechSynthesisAvailable: false,
				isSpeaking: false,
			},
		});

		await wrapper.get('[data-test-id="agent-chat-message-copy"]').trigger('click');

		expect(copySpy).toHaveBeenCalledWith('First reply\n\nSecond reply');
	});

	it('uses the stop-reading label and emits read-aloud while speaking', async () => {
		const wrapper = mount(AgentChatMessageActions, {
			props: {
				content: 'Agent reply',
				isSpeechSynthesisAvailable: true,
				isSpeaking: true,
			},
		});

		const button = wrapper.get('[data-test-id="agent-chat-message-read-aloud"]');
		expect(button.attributes('aria-label')).toBe('chatHub.message.actions.stopReading');
		expect(button.attributes('aria-pressed')).toBe('true');

		await button.trigger('click');
		expect(wrapper.emitted('readAloud')).toHaveLength(1);
	});

	it('renders send-to-assistant only when enabled and emits on click', async () => {
		const wrapper = mount(AgentChatMessageActions, {
			props: {
				content: 'Agent reply',
				isSpeechSynthesisAvailable: false,
				isSpeaking: false,
				canSendToAssistant: true,
			},
		});

		const button = wrapper.get('[data-test-id="agent-chat-message-send-to-assistant"]');
		expect(button.attributes('aria-label')).toBe('agents.builder.preview.sendToAssistant');

		await button.trigger('click');
		expect(wrapper.emitted('sendToAssistant')).toHaveLength(1);
	});

	it('does not render optional actions when unavailable', () => {
		const wrapper = mount(AgentChatMessageActions, {
			props: {
				content: 'Agent reply',
				isSpeechSynthesisAvailable: false,
				isSpeaking: false,
				canSendToAssistant: false,
			},
		});

		expect(wrapper.find('[data-test-id="agent-chat-message-read-aloud"]').exists()).toBe(false);
		expect(wrapper.find('[data-test-id="agent-chat-message-send-to-assistant"]').exists()).toBe(
			false,
		);
	});
});
