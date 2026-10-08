import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { N8N_CHAT_ACTION_TOOL_NAME, type AgentPersistedMessageContentPart } from '@n8n/api-types';

import {
	applyOpenSuspensions,
	convertDbMessages,
} from '@/features/ai/shared/agentsChat/messageMappers';
import type { ToolCall } from '@/features/ai/shared/agentsChat/types';
import {
	READ_THEN_EDIT_TURN,
	text,
	toPersistedMessage,
} from '@/features/ai/shared/agentsChat/__tests__/fixtures/orderedParts';
import AgentChatMessageList from '../components/AgentChatMessageList.vue';
import { planView } from './fixtures/agent-plan';

vi.mock('@n8n/design-system', () => ({
	N8nButton: { template: '<button v-bind="$attrs"><slot /></button>' },
	N8nCallout: { template: '<div v-bind="$attrs"><slot /></div>' },
	N8nIcon: { template: '<i />' },
	N8nIconButton: { template: '<button v-bind="$attrs" />' },
	N8nText: { template: '<span v-bind="$attrs"><slot /></span>' },
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@/features/agents/components/AgentMarkdownChunk.vue', () => ({
	default: {
		template: '<div data-testid="markdown-chunk">{{ source }}</div>',
		props: ['source'],
	},
}));

vi.mock('@/features/agents/components/AgentChatToolSteps.vue', () => ({
	default: {
		name: 'AgentChatToolSteps',
		template:
			'<div data-testid="tool-steps">{{ toolCalls.map((call) => call.toolCallId).join(",") }}</div>',
		props: ['toolCalls', 'projectId', 'canFixWithAssistant', 'dismissedToolCallIds', 'executionId'],
	},
}));

vi.mock('@/features/agents/components/interactive/InteractiveCard.vue', () => ({
	default: {
		template: '<div data-testid="interactive-card">{{ payload.toolCallId }}</div>',
		props: ['payload'],
	},
}));

vi.mock('@/features/agents/components/AgentChatMessageActions.vue', () => ({
	default: { template: '<div data-testid="message-actions" />', props: ['content'] },
}));

vi.mock('@/features/agents/components/AgentChatMemoryUsed.vue', () => ({
	default: { template: '<div />', props: ['memories'] },
}));

const BLOCK_LABELS: Record<string, string> = {
	'markdown-chunk': 'text',
	'tool-steps': 'tools',
	'interactive-card': 'card',
};

/** The chat's visible blocks in document order: text chunks, step lists and cards. */
function renderedBlocks(messages: ReturnType<typeof convertDbMessages>): string[] {
	const wrapper = mount(AgentChatMessageList, { props: { messages, messagingState: 'idle' } });
	return wrapper
		.findAll(
			'[data-testid="markdown-chunk"], [data-testid="tool-steps"], [data-testid="interactive-card"]',
		)
		.map((block) => `${BLOCK_LABELS[block.attributes('data-testid') ?? '']}: ${block.text()}`);
}

function planPart(
	tool: 'create_plan' | 'update_plan',
	toolCallId: string,
	output: unknown,
): AgentPersistedMessageContentPart {
	return { type: 'tool-call', toolName: tool, toolCallId, input: {}, state: 'resolved', output };
}

describe('AgentChatMessageList — reloaded history order', () => {
	it('renders text → 3 tools → text → 2 tools → text in that order', () => {
		const messages = convertDbMessages([
			toPersistedMessage([...READ_THEN_EDIT_TURN, text('Both files are updated.')]),
		]);

		expect(renderedBlocks(messages)).toEqual([
			"text: I'll read the instructions first.",
			'tools: read-1,read-2,read-3',
			'text: Now I will update the two files.',
			'tools: edit-1,edit-2',
			'text: Both files are updated.',
		]);
	});

	it('shows one footer for the turn, after its last text', () => {
		const messages = convertDbMessages([
			toPersistedMessage([...READ_THEN_EDIT_TURN, text('Both files are updated.')]),
		]);
		const wrapper = mount(AgentChatMessageList, { props: { messages, messagingState: 'idle' } });
		const footers = wrapper.findAll('[data-testid="message-actions"]');
		const chunks = wrapper.findAll('[data-testid="markdown-chunk"]');

		expect(footers).toHaveLength(1);
		expect(
			chunks.at(-1)!.element.compareDocumentPosition(footers[0].element) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it('keeps a plan progress call hidden when it sits between two texts', () => {
		const messages = convertDbMessages([
			{
				...toPersistedMessage([]),
				content: [
					{ type: 'text', text: 'I made a plan.' },
					planPart('create_plan', 'plan-1', planView()),
					{ type: 'text', text: 'Starting the first task.' },
					planPart('update_plan', 'plan-2', planView({ revision: 2 })),
					{ type: 'text', text: 'The first task is done.' },
				],
			},
		]);
		const hiddenCall: ToolCall | undefined = messages
			.flatMap((message) => message.toolCalls ?? [])
			.find((call) => call.toolCallId === 'plan-2');

		expect(hiddenCall).toBeDefined();
		expect(renderedBlocks(messages)).toEqual([
			'text: I made a plan.',
			'tools: plan-1',
			'text: Starting the first task.',
			'text: The first task is done.',
		]);
	});

	it('renders a display card between the texts around it', () => {
		const messages = convertDbMessages([
			{
				...toPersistedMessage([]),
				content: [
					{ type: 'text', text: 'Here is the account.' },
					{
						type: 'tool-call',
						toolName: N8N_CHAT_ACTION_TOOL_NAME,
						toolCallId: 'card-1',
						input: {
							action: 'respond',
							input: {
								message: {
									card: {
										title: 'Account snapshot',
										components: [{ type: 'fields', fields: [{ label: 'ARR', value: '$1m' }] }],
									},
								},
							},
						},
						state: 'resolved',
						output: { ok: true },
					},
					{ type: 'text', text: 'Tell me what to change.' },
				],
			},
		]);

		expect(renderedBlocks(messages)).toEqual([
			'text: Here is the account.',
			'tools: card-1',
			'card: card-1',
			'text: Tell me what to change.',
		]);
	});

	it.each([
		{ state: 'waits for an answer', answered: false, footers: 0 },
		{ state: 'is answered', answered: true, footers: 1 },
	])('shows the turn footer only when a card that text follows $state', ({ answered, footers }) => {
		const approval: AgentPersistedMessageContentPart = {
			type: 'tool-call',
			toolName: 'delete_file',
			toolCallId: 'call-card',
			input: { path: 'a.md' },
			suspendPayload: { type: 'approval', toolName: 'delete_file', args: { path: 'a.md' } },
			...(answered && { state: 'resolved', output: { approved: true } }),
		};
		const messages = applyOpenSuspensions(
			convertDbMessages([
				{
					id: 'checkpoint-1',
					role: 'assistant',
					content: [
						{ type: 'text', text: 'I will delete a.md.' },
						approval,
						{ type: 'text', text: 'Waiting for you.' },
					],
				},
			]),
			answered ? [] : [{ toolCallId: 'call-card', runId: 'run-1' }],
		);
		const wrapper = mount(AgentChatMessageList, { props: { messages, messagingState: 'idle' } });

		expect(wrapper.findAll('[data-testid="message-actions"]')).toHaveLength(footers);
	});
});
