import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { computed, h, ref } from 'vue';
import { APPROVAL_TOOL_NAME, N8N_CHAT_ACTION_TOOL_NAME } from '@n8n/api-types';
import type { ChatMessage } from '@/features/ai/shared/agentsChat/types';
import AgentChatPanel from '../components/AgentChatPanel.vue';

const sendMessageMock = vi.fn();
const stopGeneratingMock = vi.fn();
const loadHistoryMock = vi.fn();
const cancelAndSteerMock = vi.fn();
const messagesMock = ref<ChatMessage[]>([]);
const isStreamingMock = ref(false);

const fatalErrorMock = ref<{ missing: string[] } | null>(null);

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => {
			const translations: Record<string, string> = {
				'agents.chat.misconfigured.issuesPrefix': 'Check:',
				'agents.chat.misconfigured.missing.tools': 'Tool configuration',
				'agents.chat.misconfigured.missing.mcpServers': 'MCP server',
				'agents.chat.misconfigured.missing.subAgents.agents': 'Sub-agent',
			};
			return translations[key] ?? key;
		},
	}),
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
		props: ['modelValue', 'placeholder', 'isStreaming', 'canSubmit', 'disabled', 'maxLength'],
		emits: ['submit', 'stop', 'update:modelValue'],
	},
}));

vi.mock('../components/AgentChatEmptyState.vue', () => ({
	default: { template: '<div data-testid="empty-state-stub" />' },
}));

vi.mock('../components/AgentChatMessageList.vue', () => ({
	default: { template: '<div data-testid="message-list-stub" />', props: ['messages'] },
}));

vi.mock('../composables/useAgentChatStream', () => ({
	useAgentChatStream: () => ({
		messages: messagesMock,
		isStreaming: isStreamingMock,
		messagingState: computed(() => (isStreamingMock.value ? 'receiving' : 'idle')),
		fatalError: fatalErrorMock,
		loadHistory: loadHistoryMock,
		sendMessage: sendMessageMock,
		stopGenerating: stopGeneratingMock,
		resume: vi.fn(),
		cancelAndSteer: cancelAndSteerMock,
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
		messagesMock.value = [];
		isStreamingMock.value = false;
		fatalErrorMock.value = null;
	});

	function mountPanel() {
		return mount(AgentChatPanel, {
			props: {
				projectId: 'p1',
				agentId: 'a1',
				agentConfig: {
					name: 'Agent',
					model: 'anthropic/claude-sonnet-4-5',
					instructions: 'Help.',
				},
				agentStatus: 'draft',
				connectedTriggers: [],
			},
		});
	}

	/**
	 * A non-approval interactive card (`chat_action`) — these put the chat
	 * input into cancel-and-steer mode rather than blocking it outright,
	 * unlike an open approval card.
	 */
	function openInteractiveMessage(): ChatMessage {
		return {
			id: 'assistant-1',
			role: 'assistant',
			content: '',
			status: 'awaitingUser',
			interactive: {
				toolName: N8N_CHAT_ACTION_TOOL_NAME,
				toolCallId: 'tc-1',
				runId: 'run-1',
				input: {
					card: { components: [{ type: 'button', label: 'Pick Slack', value: 'slack' }] },
				},
			},
		};
	}

	function resolvedInteractiveMessage(): ChatMessage {
		return {
			...openInteractiveMessage(),
			status: 'success',
			interactive: {
				toolName: N8N_CHAT_ACTION_TOOL_NAME,
				toolCallId: 'tc-1',
				resolvedAt: 1,
				input: {
					card: { components: [{ type: 'button', label: 'Pick Slack', value: 'slack' }] },
				},
				resolvedValue: { type: 'button', value: 'slack' },
			},
		};
	}

	it('awaits beforeSend before sending a chat message', async () => {
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

		const wrapper = mount(AgentChatPanel, {
			props: {
				projectId: 'p1',
				agentId: 'a1',
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

	it('enables chat input and shows answer-question placeholder while an interactive question is unresolved', () => {
		messagesMock.value = [openInteractiveMessage()];

		const wrapper = mountPanel();
		const chatInput = wrapper.findComponent({ name: 'ChatInputBase' });

		// Input should be ENABLED so the user can cancel and steer
		expect(chatInput.props('disabled')).toBe(false);
		expect(chatInput.props('placeholder')).toBe('agents.chat.answerQuestionPlaceholder');
	});

	it('disables above-input actions while an interactive question is unresolved', () => {
		messagesMock.value = [openInteractiveMessage()];

		const wrapper = mount(AgentChatPanel, {
			props: {
				projectId: 'p1',
				agentId: 'a1',
				agentConfig: {
					name: 'Agent',
					model: 'anthropic/claude-sonnet-4-5',
					instructions: 'Help.',
				},
				agentStatus: 'draft',
				connectedTriggers: [],
			},
			slots: {
				'above-input': ({ disabled }) =>
					h('div', {
						'data-testid': 'above-input-actions',
						'data-disabled': String(disabled),
					}),
			},
		});

		expect(wrapper.find('[data-testid="above-input-actions"]').attributes('data-disabled')).toBe(
			'true',
		);
	});

	it('keeps above-input actions enabled when the interactive card is resolved', () => {
		messagesMock.value = [resolvedInteractiveMessage()];

		const wrapper = mount(AgentChatPanel, {
			props: {
				projectId: 'p1',
				agentId: 'a1',
				agentConfig: {
					name: 'Agent',
					model: 'anthropic/claude-sonnet-4-5',
					instructions: 'Help.',
				},
				agentStatus: 'draft',
				connectedTriggers: [],
			},
			slots: {
				'above-input': ({ disabled }) =>
					h('div', {
						'data-testid': 'above-input-actions',
						'data-disabled': String(disabled),
					}),
			},
		});

		expect(wrapper.find('[data-testid="above-input-actions"]').attributes('data-disabled')).toBe(
			'false',
		);
	});

	it('calls cancelAndSteer (not sendMessage) when the user submits while an interactive question is open', async () => {
		messagesMock.value = [openInteractiveMessage()];

		const wrapper = mountPanel();

		(
			wrapper.vm as unknown as { sendMessageFromOutside: (message: string) => void }
		).sendMessageFromOutside('go another direction');
		await flushPromises();

		expect(cancelAndSteerMock).toHaveBeenCalledWith('go another direction');
		expect(sendMessageMock).not.toHaveBeenCalled();
	});

	it('keeps chat enabled when the interactive card is resolved', () => {
		messagesMock.value = [
			{
				...openInteractiveMessage(),
				status: 'success',
				interactive: {
					toolName: APPROVAL_TOOL_NAME,
					toolCallId: 'tc-1',
					resolvedAt: 1,
					input: { type: 'approval', toolName: 'send_message', args: {} },
					resolvedValue: { approved: true },
				},
			},
		];

		const wrapper = mountPanel();
		const chatInput = wrapper.findComponent({ name: 'ChatInputBase' });

		expect(chatInput.props('disabled')).toBe(false);
		expect(chatInput.props('placeholder')).toBe('agents.chat.input.placeholder');
	});

	it('enables chat input while an interactive card is unresolved (cancel-and-steer mode)', () => {
		messagesMock.value = [openInteractiveMessage()];

		const wrapper = mountPanel();
		const chatInput = wrapper.findComponent({ name: 'ChatInputBase' });

		// Input should be enabled — the user can cancel and steer
		expect(chatInput.props('disabled')).toBe(false);
	});

	it('does not apply a build-specific character limit', () => {
		const wrapper = mountPanel();
		const chatInput = wrapper.findComponent({ name: 'ChatInputBase' });

		expect(chatInput.props('maxLength')).toBe(undefined);
	});

	it('humanises runtime issue paths with generic localized labels', () => {
		fatalErrorMock.value = {
			missing: [
				'tools.0.workflow',
				'mcpServers.0.url',
				'subAgents.agents.0.agentId',
				'integrations.0.credentialId',
			],
		};

		const wrapper = mountPanel();

		expect(wrapper.text()).toContain('Check:');
		expect(wrapper.text()).toContain('Tool configuration');
		expect(wrapper.text()).toContain('MCP server');
		expect(wrapper.text()).toContain('Sub-agent');
		expect(wrapper.text()).toContain('integrations.0.credentialId');
	});
});
