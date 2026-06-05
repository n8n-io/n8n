import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { computed, ref } from 'vue';
import {
	ASK_CREDENTIAL_TOOL_NAME,
	ASK_LLM_TOOL_NAME,
	ASK_QUESTION_TOOL_NAME,
	type InteractiveToolName,
} from '@n8n/api-types';
import type { ChatMessage } from '../composables/agentChatMessages';
import AgentChatPanel from '../components/AgentChatPanel.vue';

const sendMessageMock = vi.fn();
const stopGeneratingMock = vi.fn();
const loadHistoryMock = vi.fn();
const cancelAndSteerMock = vi.fn();
const messagesMock = ref<ChatMessage[]>([]);
const isStreamingMock = ref(false);

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
		messages: messagesMock,
		isStreaming: isStreamingMock,
		messagingState: computed(() => (isStreamingMock.value ? 'receiving' : 'idle')),
		fatalError: ref(null),
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
	});

	function mountPanel() {
		return mount(AgentChatPanel, {
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
			},
		});
	}

	function openInteractiveMessage(
		toolName: InteractiveToolName = ASK_QUESTION_TOOL_NAME,
	): ChatMessage {
		return {
			id: 'assistant-1',
			role: 'assistant',
			content: '',
			status: 'awaitingUser',
			interactive:
				toolName === ASK_QUESTION_TOOL_NAME
					? {
							toolName: ASK_QUESTION_TOOL_NAME,
							toolCallId: 'tc-1',
							runId: 'run-1',
							input: {
								question: 'Pick one',
								options: [{ label: 'Slack', value: 'slack' }],
							},
						}
					: toolName === ASK_LLM_TOOL_NAME
						? {
								toolName: ASK_LLM_TOOL_NAME,
								toolCallId: 'tc-1',
								runId: 'run-1',
								input: { purpose: 'Choose a model' },
							}
						: {
								toolName: ASK_CREDENTIAL_TOOL_NAME,
								toolCallId: 'tc-1',
								runId: 'run-1',
								input: {
									purpose: 'Choose Slack credentials',
									credentialType: 'slackApi',
								},
							},
		};
	}

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

	it('does not consume a seeded initial message in a read-only build chat', async () => {
		const beforeSend = vi.fn();

		const wrapper = mount(AgentChatPanel, {
			props: {
				projectId: 'p1',
				agentId: 'a1',
				endpoint: 'build',
				canEditAgent: false,
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

		expect(beforeSend).not.toHaveBeenCalled();
		expect(sendMessageMock).not.toHaveBeenCalled();
		expect(wrapper.emitted('initial-consumed')).toBeUndefined();
		// History is loaded instead so any existing thread renders, rather than
		// the misleading "describe your agent" empty state.
		expect(loadHistoryMock).toHaveBeenCalledTimes(1);
	});

	it('enables chat input and shows answer-question placeholder while an interactive question is unresolved', () => {
		messagesMock.value = [openInteractiveMessage()];

		const wrapper = mountPanel();
		const chatInput = wrapper.findComponent({ name: 'ChatInputBase' });

		// Input should be ENABLED so the user can cancel and steer
		expect(chatInput.props('disabled')).toBe(false);
		expect(chatInput.props('placeholder')).toBe('agents.chat.answerQuestionPlaceholder');
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
					toolName: ASK_QUESTION_TOOL_NAME,
					toolCallId: 'tc-1',
					resolvedAt: 1,
					input: {
						question: 'Pick one',
						options: [{ label: 'Slack', value: 'slack' }],
					},
					resolvedValue: { values: ['slack'] },
				},
			},
		];

		const wrapper = mountPanel();
		const chatInput = wrapper.findComponent({ name: 'ChatInputBase' });

		expect(chatInput.props('disabled')).toBe(false);
		expect(chatInput.props('placeholder')).toBe('agents.chat.input.placeholder');
	});

	it.each([ASK_LLM_TOOL_NAME, ASK_CREDENTIAL_TOOL_NAME])(
		'enables chat input while %s is unresolved (cancel-and-steer mode)',
		(toolName) => {
			messagesMock.value = [openInteractiveMessage(toolName)];

			const wrapper = mountPanel();
			const chatInput = wrapper.findComponent({ name: 'ChatInputBase' });

			// Input should be enabled — the user can cancel and steer
			expect(chatInput.props('disabled')).toBe(false);
		},
	);
});
