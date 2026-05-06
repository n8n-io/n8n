import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { computed, ref } from 'vue';

const sendMessageMock = vi.fn();
const stopGeneratingMock = vi.fn();
const loadHistoryMock = vi.fn();

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@n8n/design-system', () => ({
	N8nButton: { template: '<button><slot /></button>' },
	N8nCallout: { template: '<div><slot /><slot name="trailingContent" /></div>' },
	N8nIconButton: { template: '<button />' },
}));

vi.mock('@/features/ai/shared/components/ChatInputBase.vue', () => ({
	default: {
		name: 'ChatInputBase',
		template:
			'<form data-testid="chat-input-stub" @submit.prevent="$emit(\'submit\')"><slot name="footer-start" /></form>',
		props: ['modelValue', 'placeholder', 'isStreaming', 'canSubmit', 'disabled'],
		emits: ['submit', 'stop', 'update:modelValue'],
	},
}));

vi.mock('../components/AgentChatEmptyState.vue', () => ({
	default: { template: '<div data-testid="empty-state-stub" />', props: ['endpoint'] },
}));

vi.mock('../components/AgentChatMessageList.vue', () => ({
	default: { template: '<div data-testid="message-list-stub" />', props: ['messages'] },
}));

vi.mock('../composables/useAgentChatStream', () => ({
	useAgentChatStream: () => ({
		messages: ref([]),
		isStreaming: ref(false),
		messagingState: computed(() => 'idle'),
		fatalError: ref(null),
		loadHistory: loadHistoryMock,
		sendMessage: sendMessageMock,
		stopGenerating: stopGeneratingMock,
		resume: vi.fn(),
		dismissFatalError: vi.fn(),
	}),
}));

vi.mock('../composables/useAgentTelemetry', () => ({
	useAgentTelemetry: () => ({ trackSubmittedMessage: vi.fn() }),
}));

vi.mock('../composables/agentTelemetry.utils', () => ({
	buildAgentConfigFingerprint: vi.fn().mockResolvedValue({
		instructions: '',
		tools: [],
		skills: [],
		triggers: [],
		memory: null,
		model: null,
		config_version: 'test-version',
	}),
}));

describe('AgentChatPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('awaits beforeSend before sending a build message', async () => {
		const events: string[] = [];
		let resolveBeforeSend: () => void = () => {};
		const beforeSend = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					resolveBeforeSend = () => {
						events.push('beforeSend');
						resolve();
					};
				}),
		);
		sendMessageMock.mockImplementation(async () => {
			events.push('sendMessage');
		});

		const { default: AgentChatPanel } = await import('../components/AgentChatPanel.vue');
		const wrapper = mount(AgentChatPanel, {
			props: {
				projectId: 'p1',
				agentId: 'a1',
				endpoint: 'build',
				agentConfig: {
					name: 'Agent',
					model: 'anthropic/claude-sonnet-4-5',
					instructions: 'Help.',
				},
				agentStatus: 'draft',
				connectedTriggers: [],
				beforeSend,
			},
		});

		(
			wrapper.vm as unknown as { sendMessageFromOutside: (message: string) => void }
		).sendMessageFromOutside('update config');
		await flushPromises();

		expect(beforeSend).toHaveBeenCalledTimes(1);
		expect(sendMessageMock).not.toHaveBeenCalled();

		resolveBeforeSend();
		await flushPromises();

		expect(sendMessageMock).toHaveBeenCalledWith('update config');
		expect(events).toEqual(['beforeSend', 'sendMessage']);
	});

	it('does not consume an initial message when beforeSend fails', async () => {
		const beforeSend = vi.fn().mockRejectedValue(new Error('flush failed'));

		const { default: AgentChatPanel } = await import('../components/AgentChatPanel.vue');
		const wrapper = mount(AgentChatPanel, {
			props: {
				projectId: 'p1',
				agentId: 'a1',
				endpoint: 'build',
				initialMessage: 'seed build prompt',
				agentConfig: {
					name: 'Agent',
					model: 'anthropic/claude-sonnet-4-5',
					instructions: 'Help.',
				},
				agentStatus: 'draft',
				connectedTriggers: [],
				beforeSend,
			},
		});

		await flushPromises();

		expect(beforeSend).toHaveBeenCalledTimes(1);
		expect(sendMessageMock).not.toHaveBeenCalled();
		expect(wrapper.emitted('initial-consumed')).toBeUndefined();
	});
});
