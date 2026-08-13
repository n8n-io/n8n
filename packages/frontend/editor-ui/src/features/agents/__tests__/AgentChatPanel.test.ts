import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { computed, defineComponent, h, ref } from 'vue';
import { APPROVAL_TOOL_NAME, N8N_CHAT_ACTION_TOOL_NAME } from '@n8n/api-types';
import type { ChatMessage } from '@/features/ai/shared/agentsChat/types';
import AgentChatPanel from '../components/AgentChatPanel.vue';
import AgentPreviewDock from '../components/AgentPreviewDock.vue';
import {
	buildAgentConfigFingerprint,
	type AgentConfigFingerprint,
} from '../composables/agentTelemetry.utils';
import type { AgentJsonConfig } from '../types';

const sendMessageMock = vi.fn();
const stopGeneratingMock = vi.fn();
const loadHistoryMock = vi.fn();
const cancelAndSteerMock = vi.fn();
const messagesMock = ref<ChatMessage[]>([]);
const isStreamingMock = ref(false);
const isCancellingMock = ref(false);
let onHistoryLoaded: ((count: number) => void) | undefined;

const fatalErrorMock = ref<{ missing: string[] } | null>(null);

const defaultAgentConfig: AgentJsonConfig = {
	name: 'Agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: 'Help.',
};

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) => {
			const translations: Record<string, string> = {
				'agents.chat.input.placeholder.withAgent': `Message ${options?.interpolate?.agentName}…`,
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
	N8nHeading: { template: '<div><slot /></div>' },
	N8nIconButton: {
		emits: ['click'],
		template: '<button v-bind="$attrs" @click="$emit(\'click\')" />',
	},
	N8nSendStopButton: {
		name: 'N8nSendStopButton',
		props: ['streaming', 'stopButtonTestId'],
		emits: ['stop'],
		template: '<button :data-test-id="stopButtonTestId" @click="$emit(\'stop\')" />',
	},
	N8nTooltip: { template: '<div><slot /></div>' },
	TOOLTIP_DELAY_MS: 500,
}));

vi.mock('@/app/components/KeyboardShortcutTooltip.vue', () => ({
	default: { template: '<div><slot /></div>' },
}));

vi.mock('@/app/composables/useKeybindings', () => ({
	useKeybindings: vi.fn(),
}));

// Reads a Pinia store for notifications — irrelevant to panel behavior.
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage: vi.fn() }),
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
	default: {
		name: 'AgentChatMessageList',
		template: '<div data-testid="message-list-stub" />',
		props: ['messages'],
		emits: ['send-to-assistant'],
	},
}));

vi.mock('../composables/useAgentChatStream', () => ({
	useAgentChatStream: (options: { onHistoryLoaded: (count: number) => void }) => {
		onHistoryLoaded = options.onHistoryLoaded;
		return {
			messages: messagesMock,
			isStreaming: isStreamingMock,
			isCancelling: isCancellingMock,
			messagingState: computed(() => (isStreamingMock.value ? 'receiving' : 'idle')),
			fatalError: fatalErrorMock,
			loadHistory: loadHistoryMock,
			sendMessage: sendMessageMock,
			stopGenerating: stopGeneratingMock,
			resume: vi.fn(),
			cancelAndSteer: cancelAndSteerMock,
			dismissFatalError: vi.fn(),
		};
	},
}));

vi.mock('../composables/useAgentTelemetry', () => ({
	useAgentTelemetry: () => ({ trackSubmittedMessage: vi.fn() }),
}));

vi.mock('../composables/agentTelemetry.utils', () => ({
	deriveAgentStatus: vi.fn(() => 'draft'),
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
		isCancellingMock.value = false;
		fatalErrorMock.value = null;
		onHistoryLoaded = undefined;
	});

	function mountPanel(
		overrides: Partial<{
			continueSessionId: string;
			agentConfig: AgentJsonConfig | null;
			beforeSend: () => Promise<void> | void;
		}> = {},
	) {
		return mount(AgentChatPanel, {
			props: {
				projectId: 'p1',
				agentId: 'a1',
				agentConfig: defaultAgentConfig,
				agentStatus: 'draft',
				connectedTriggers: [],
				...overrides,
			},
		});
	}

	it('uses the live agent name in the normal chat placeholder', async () => {
		const wrapper = mountPanel();
		const chatInput = wrapper.findComponent({ name: 'ChatInputBase' });

		expect(chatInput.props('placeholder')).toBe('Message Agent…');

		await wrapper.setProps({
			agentConfig: { ...defaultAgentConfig, name: 'Support Agent' },
		});

		expect(chatInput.props('placeholder')).toBe('Message Support Agent…');
	});

	it.each([
		['a missing config', null],
		['a blank agent name', { ...defaultAgentConfig, name: '   ' }],
	] satisfies Array<[string, AgentJsonConfig | null]>)(
		'uses the generic chat placeholder for %s',
		(_description, agentConfig) => {
			const wrapper = mountPanel({ agentConfig });
			const chatInput = wrapper.findComponent({ name: 'ChatInputBase' });

			expect(chatInput.props('placeholder')).toBe('agents.chat.input.placeholder');
		},
	);

	it('emits the loaded history count with the session that produced it', () => {
		const wrapper = mountPanel({
			continueSessionId: 'session-1',
			agentConfig: null,
		});

		expect(onHistoryLoaded).toBeDefined();
		onHistoryLoaded?.(3);

		expect(wrapper.emitted('continue-loaded')).toEqual([[{ sessionId: 'session-1', count: 3 }]]);
	});

	it('forwards Fix with Assistant metadata from the message list', () => {
		messagesMock.value = [
			{ id: 'assistant-1', role: 'assistant', content: 'Failed', status: 'error' },
		];
		const fixEvent = {
			executionId: 'execution-1',
			failures: [
				{
					toolCallId: 'call-1',
					toolName: 'http_request',
					toolDisplayName: 'HTTP request',
					error: 'Request failed',
				},
			],
		};
		const wrapper = mountPanel();

		wrapper.findComponent({ name: 'AgentChatMessageList' }).vm.$emit('send-to-assistant', fixEvent);

		expect(wrapper.emitted('send-to-assistant')).toEqual([[fixEvent]]);
	});

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

		const wrapper = mountPanel({ beforeSend });

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

	it.each([
		[
			'the session changes',
			async (wrapper: ReturnType<typeof mountPanel>) => {
				await wrapper.setProps({ continueSessionId: 'session-2' });
			},
		],
		['the panel unmounts', async (wrapper: ReturnType<typeof mountPanel>) => wrapper.unmount()],
	])('does not send a message after beforeSend resolves if %s', async (_condition, invalidate) => {
		const beforeSend = Promise.withResolvers<void>();
		const wrapper = mountPanel({
			continueSessionId: 'session-1',
			beforeSend: () => beforeSend.promise,
		});

		(
			wrapper.vm as unknown as { sendMessageFromOutside: (message: string) => void }
		).sendMessageFromOutside('update config');
		await flushPromises();
		await invalidate(wrapper);
		beforeSend.resolve();
		await flushPromises();

		expect(sendMessageMock).not.toHaveBeenCalled();
	});

	it('does not send a message if the session changes while preparing telemetry', async () => {
		const fingerprint = Promise.withResolvers<AgentConfigFingerprint>();
		vi.mocked(buildAgentConfigFingerprint).mockReturnValueOnce(fingerprint.promise);
		const wrapper = mountPanel({ continueSessionId: 'session-1' });

		(
			wrapper.vm as unknown as { sendMessageFromOutside: (message: string) => void }
		).sendMessageFromOutside('update config');
		await vi.waitFor(() => expect(buildAgentConfigFingerprint).toHaveBeenCalledOnce());
		await wrapper.setProps({ continueSessionId: 'session-2' });
		fingerprint.resolve({
			instructions: '',
			tools: [],
			skills: [],
			tasks: [],
			triggers: [],
			vector_stores: [],
			memory: null,
			model: null,
			config_version: 'test-version',
		});
		await flushPromises();

		expect(sendMessageMock).not.toHaveBeenCalled();
	});

	it('keeps the draft while suspended-run cancellation is pending', async () => {
		isCancellingMock.value = true;
		const wrapper = mountPanel();

		(
			wrapper.vm as unknown as { sendMessageFromOutside: (message: string) => void }
		).sendMessageFromOutside('keep this draft');
		await flushPromises();

		const chatInput = wrapper.findComponent({ name: 'ChatInputBase' });
		expect(chatInput.props('modelValue')).toBe('keep this draft');
		expect(chatInput.props('disabled')).toBe(true);
		expect(sendMessageMock).not.toHaveBeenCalled();
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
		expect(chatInput.props('placeholder')).toBe('Message Agent…');
	});

	it('enables chat input while an interactive card is unresolved (cancel-and-steer mode)', () => {
		messagesMock.value = [openInteractiveMessage()];

		const wrapper = mountPanel();
		const chatInput = wrapper.findComponent({ name: 'ChatInputBase' });

		// Input should be enabled — the user can cancel and steer
		expect(chatInput.props('disabled')).toBe(false);
	});

	it('shows send and stop controls while an interactive question is unresolved', async () => {
		messagesMock.value = [openInteractiveMessage()];

		const wrapper = mountPanel();
		const chatInput = wrapper.findComponent({ name: 'ChatInputBase' });

		expect(chatInput.props('isStreaming')).toBe(false);
		const stopButton = wrapper.find('[data-test-id="agent-chat-suspended-stop-button"]');
		expect(stopButton.exists()).toBe(true);
		await stopButton.trigger('click');
		await flushPromises();
		expect(stopGeneratingMock).toHaveBeenCalledTimes(1);
	});

	it('keeps the stop control available for a non-card suspension', () => {
		messagesMock.value = [
			{
				id: 'assistant-1',
				role: 'assistant',
				content: '',
				toolCalls: [
					{
						tool: 'external_action',
						toolCallId: 'tc-1',
						runId: 'run-1',
						state: 'suspended',
					},
				],
			},
		];

		const wrapper = mountPanel();
		const chatInput = wrapper.findComponent({ name: 'ChatInputBase' });

		expect(chatInput.props('isStreaming')).toBe(true);
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

describe('AgentPreviewDock stream lifecycle', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		messagesMock.value = [];
		isStreamingMock.value = true;
		isCancellingMock.value = false;
		fatalErrorMock.value = null;
	});

	function mountPreviewDock() {
		return mount(
			defineComponent({
				setup() {
					const open = ref(true);
					const sessionId = ref('session-1');
					return () =>
						open.value
							? h(AgentPreviewDock, {
									sessionTitle: 'Session',
									hasSession: true,
									initialized: true,
									projectId: 'p1',
									agentId: 'a1',
									agent: null,
									localConfig: defaultAgentConfig,
									connectedTriggers: [],
									effectiveSessionId: sessionId.value,
									onClose: () => (open.value = false),
									onNewSession: () => (sessionId.value = 'session-2'),
								})
							: null;
				},
			}),
		);
	}

	it.each([
		['closes', 'agent-preview-close-btn'],
		['starts a new session', 'agent-preview-new-chat-btn'],
	])('stops an in-flight stream when the preview %s', async (_action, testId) => {
		const wrapper = mountPreviewDock();

		await wrapper.get(`[data-testid="${testId}"]`).trigger('click');
		await flushPromises();

		expect(stopGeneratingMock).toHaveBeenCalledOnce();
		isStreamingMock.value = false;
		wrapper.unmount();
	});
});
