import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AgentChatMessageList from '../components/AgentChatMessageList.vue';
import type { ChatMessage } from '@/features/ai/shared/agentsChat/types';

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
	N8nText: {
		template: '<span v-bind="$attrs"><slot /></span>',
		props: ['size', 'color', 'tag'],
	},
}));

vi.mock('@/features/agents/components/AgentMarkdownChunk.vue', () => ({
	default: {
		template: '<div data-testid="markdown-chunk">{{ source }}</div>',
		props: ['source'],
	},
}));

vi.mock('@/features/ai/chatHub/components/ChatTypingIndicator.vue', () => ({
	default: { template: '<div data-test-id="typing-indicator" />' },
}));

vi.mock('@/features/agents/components/AgentChatToolSteps.vue', () => ({
	default: { template: '<div />', props: ['toolCalls', 'projectId'] },
}));

vi.mock('@/features/agents/components/interactive/InteractiveCard.vue', () => ({
	default: {
		template:
			'<div data-testid="interactive-card-stub" :data-tool-call-id="payload.toolCallId" :data-run-id="payload.runId || \'\'" />',
		props: ['payload', 'projectId', 'agentId'],
	},
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
	useI18n: () => ({
		baseText: (key: string, opts?: { interpolate?: Record<string, unknown> }) => {
			if (!opts?.interpolate) return key;
			// Include interpolated values in output so tests can assert on them
			const values = Object.values(opts.interpolate)
				.map((v) => String(v))
				.join(' ');
			return `${key} ${values}`.trim();
		},
	}),
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

	it('renders external-wait notice via toolRun path for suspended integration action', () => {
		// isGroupable: role=assistant, toolCalls.length>0, content is empty → toolRun group
		const wrapper = mount(AgentChatMessageList, {
			props: {
				messages: [
					{
						id: 'assistant-slack',
						role: 'assistant',
						content: '',
						toolCalls: [
							{
								tool: 'slack_action',
								toolCallId: 'tc-x',
								state: 'suspended',
								suspendPayload: { type: 'integration_action' },
							},
						],
						status: 'success',
					} satisfies ChatMessage,
				],
				messagingState: 'idle',
			},
		});

		const notices = wrapper.findAll('[data-testid="agent-chat-external-wait"]');
		expect(notices.length).toBeGreaterThan(0);
		expect(notices[0].text()).toContain('Slack');
	});

	it('strips the connection suffix from numbered integration tools (slack_2_action → Slack)', () => {
		// Second connection of the same platform: backend names it `slack_2_action`.
		const wrapper = mount(AgentChatMessageList, {
			props: {
				messages: [
					{
						id: 'assistant-slack-2',
						role: 'assistant',
						content: '',
						toolCalls: [
							{
								tool: 'slack_2_action',
								toolCallId: 'tc-y',
								state: 'suspended',
								suspendPayload: { type: 'integration_action' },
							},
						],
						status: 'success',
					} satisfies ChatMessage,
				],
				messagingState: 'idle',
			},
		});

		const notices = wrapper.findAll('[data-testid="agent-chat-external-wait"]');
		expect(notices.length).toBeGreaterThan(0);
		expect(notices[0].text()).toContain('Slack');
		expect(notices[0].text()).not.toContain('Slack_2');
	});

	it('renders resolved display cards before assistant message actions', () => {
		const wrapper = mount(AgentChatMessageList, {
			props: {
				messages: [
					{
						id: 'assistant-display-card',
						role: 'assistant',
						content: 'Here is your snapshot',
						interactive: {
							toolName: 'chat_action',
							toolCallId: 'tc-display',
							resolvedAt: 1,
							input: {
								card: {
									components: [{ type: 'fields', fields: [{ label: 'ARR', value: '$1m' }] }],
								},
							},
						},
						status: 'success',
					} satisfies ChatMessage,
				],
				messagingState: 'idle',
			},
		});

		const card = wrapper.find('[data-testid="interactive-card-stub"]').element;
		const actions = wrapper.find('[data-test-id="agent-chat-message-actions"]').element;

		expect(card.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it('renders display cards in persisted text order before the assistant footer', () => {
		const wrapper = mount(AgentChatMessageList, {
			props: {
				messages: [
					{
						id: 'assistant-display-card',
						role: 'assistant',
						content: 'Before the card.After the card.',
						renderParts: [
							{ type: 'text', text: 'Before the card.' },
							{ type: 'interactive', toolCallId: 'tc-display' },
							{ type: 'text', text: 'After the card.' },
						],
						interactive: {
							toolName: 'chat_action',
							toolCallId: 'tc-display',
							resolvedAt: 1,
							input: {
								card: {
									components: [{ type: 'fields', fields: [{ label: 'ARR', value: '$1m' }] }],
								},
							},
						},
						status: 'success',
					} satisfies ChatMessage,
				],
				messagingState: 'idle',
			},
		});

		const chunks = wrapper.findAll('[data-testid="markdown-chunk"]');
		const card = wrapper.find('[data-testid="interactive-card-stub"]').element;
		const actions = wrapper.find('[data-test-id="agent-chat-message-actions"]').element;

		expect(chunks).toHaveLength(2);
		expect(chunks[0].text()).toBe('Before the card.');
		expect(chunks[1].text()).toBe('After the card.');
		expect(
			chunks[0].element.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(
			card.compareDocumentPosition(chunks[1].element) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(
			chunks[1].element.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it('renders multiple n8n chat cards from one assistant message', () => {
		const wrapper = mount(AgentChatMessageList, {
			props: {
				messages: [
					{
						id: 'assistant-display-cards',
						role: 'assistant',
						content: 'Here are your snapshots',
						interactives: [
							{
								toolName: 'chat_action',
								toolCallId: 'tc-display-1',
								resolvedAt: 1,
								input: {
									card: {
										components: [{ type: 'fields', fields: [{ label: 'ARR', value: '$1m' }] }],
									},
								},
							},
							{
								toolName: 'chat_action',
								toolCallId: 'tc-display-2',
								resolvedAt: 1,
								input: {
									card: {
										components: [{ type: 'fields', fields: [{ label: 'Pipeline', value: '$4m' }] }],
									},
								},
							},
						],
						status: 'success',
					} satisfies ChatMessage,
				],
				messagingState: 'idle',
			},
		});

		expect(wrapper.findAll('[data-testid="interactive-card-stub"]')).toHaveLength(2);
	});

	it('clears an answered n8n chat card from the chat', () => {
		const wrapper = mount(AgentChatMessageList, {
			props: {
				messages: [
					{
						id: 'assistant-answered-card',
						role: 'assistant',
						content: 'Got it',
						interactive: {
							toolName: 'chat_action',
							toolCallId: 'tc-answered',
							resolvedAt: 1,
							input: {
								card: { components: [{ type: 'button', label: 'Approve', value: 'approve' }] },
							},
							resolvedValue: { type: 'button', value: 'approve' },
						},
						status: 'success',
					} satisfies ChatMessage,
				],
				messagingState: 'idle',
			},
		});

		expect(wrapper.find('[data-testid="interactive-card-stub"]').exists()).toBe(false);
	});

	it('renders only reload-restored open cards that can still be resumed', () => {
		const wrapper = mount(AgentChatMessageList, {
			props: {
				messages: [
					{
						id: 'assistant-open-cards',
						role: 'assistant',
						content: '',
						interactives: [
							{
								toolName: 'chat_action',
								toolCallId: 'tc-stale',
								input: {
									card: { components: [{ type: 'button', label: 'Old', value: 'old' }] },
								},
							},
							{
								toolName: 'chat_action',
								toolCallId: 'tc-active',
								runId: 'run-active',
								input: {
									card: { components: [{ type: 'button', label: 'Approve', value: 'approve' }] },
								},
							},
						],
						status: 'awaitingUser',
					} satisfies ChatMessage,
				],
				messagingState: 'idle',
			},
		});

		const cards = wrapper.findAll('[data-testid="interactive-card-stub"]');
		expect(cards).toHaveLength(1);
		expect(cards[0].attributes('data-tool-call-id')).toBe('tc-active');
		expect(cards[0].attributes('data-run-id')).toBe('run-active');
	});

	it('collapses resolved builder cards into the tool-step summary (no card)', () => {
		const wrapper = mount(AgentChatMessageList, {
			props: {
				messages: [
					{
						id: 'assistant-resolved-question',
						role: 'assistant',
						content: 'Thanks!',
						interactive: {
							toolName: 'ask_question',
							toolCallId: 'tc-q',
							resolvedAt: 1,
							input: { question: 'Pick one', options: [{ label: 'A', value: 'a' }] },
							resolvedValue: { values: ['a'] },
						},
						status: 'success',
					} satisfies ChatMessage,
				],
				messagingState: 'idle',
			},
		});

		expect(wrapper.find('[data-testid="interactive-card-stub"]').exists()).toBe(false);
	});

	it('does not render external-wait notice for suspended chat_action tool (toolRun path)', () => {
		// isGroupable: role=assistant, toolCalls.length>0, content is empty → toolRun group
		const wrapper = mount(AgentChatMessageList, {
			props: {
				messages: [
					{
						id: 'assistant-n8n',
						role: 'assistant',
						content: '',
						toolCalls: [
							{
								tool: 'chat_action',
								toolCallId: 'tc-n8n',
								state: 'suspended',
								suspendPayload: { type: 'integration_action' },
							},
						],
						status: 'success',
					} satisfies ChatMessage,
				],
				messagingState: 'idle',
			},
		});

		expect(wrapper.find('[data-testid="agent-chat-external-wait"]').exists()).toBe(false);
	});

	it('renders external-wait notice via message path for suspended integration action (non-empty content)', () => {
		// isGroupable: role=assistant, toolCalls.length>0, but content is non-empty → message group
		const wrapper = mount(AgentChatMessageList, {
			props: {
				messages: [
					{
						id: 'assistant-slack-msg',
						role: 'assistant',
						content: 'Working on it...',
						toolCalls: [
							{
								tool: 'slack_action',
								toolCallId: 'tc-x',
								state: 'suspended',
								suspendPayload: { type: 'integration_action' },
							},
						],
						status: 'success',
					} satisfies ChatMessage,
				],
				messagingState: 'idle',
			},
		});

		const notices = wrapper.findAll('[data-testid="agent-chat-external-wait"]');
		expect(notices.length).toBeGreaterThan(0);
		expect(notices[0].text()).toContain('Slack');
	});

	it('does not render external-wait notice for suspended chat_action (message path)', () => {
		// isGroupable: role=assistant, toolCalls.length>0, but content is non-empty → message group
		const wrapper = mount(AgentChatMessageList, {
			props: {
				messages: [
					{
						id: 'assistant-n8n-msg',
						role: 'assistant',
						content: 'Working on it...',
						toolCalls: [
							{
								tool: 'chat_action',
								toolCallId: 'tc-n8n',
								state: 'suspended',
								suspendPayload: { type: 'integration_action' },
							},
						],
						status: 'success',
					} satisfies ChatMessage,
				],
				messagingState: 'idle',
			},
		});

		expect(wrapper.find('[data-testid="agent-chat-external-wait"]').exists()).toBe(false);
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
