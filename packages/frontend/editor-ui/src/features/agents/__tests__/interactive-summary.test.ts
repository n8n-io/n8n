import { describe, expect, it } from 'vitest';
import {
	ASK_CREDENTIAL_TOOL_NAME,
	ASK_LLM_TOOL_NAME,
	ASK_QUESTION_TOOL_NAME,
	N8N_CHAT_ACTION_TOOL_NAME,
} from '@n8n/api-types';
import {
	summariseInteractiveOutput,
	summariseToolCall,
} from '@/features/ai/shared/agentsChat/interactiveSummary';
import { DELEGATE_SUB_AGENT_TOOL_NAME } from '../utils/delegate-tool';
import { WRITE_TODOS_TOOL_NAME } from '../utils/write-todos-tool';

describe('summariseInteractiveOutput', () => {
	it('returns undefined for non-interactive tool names', () => {
		expect(summariseInteractiveOutput('search_nodes', { foo: 'bar' })).toBeUndefined();
	});

	it('returns undefined when output is missing', () => {
		expect(summariseInteractiveOutput(ASK_QUESTION_TOOL_NAME, undefined)).toBeUndefined();
	});

	it.each([null, 'oops', 42, true, ['x']])(
		'returns undefined for non-object output (%p)',
		(value) => {
			expect(summariseInteractiveOutput(ASK_CREDENTIAL_TOOL_NAME, value)).toBeUndefined();
			expect(summariseInteractiveOutput(ASK_LLM_TOOL_NAME, value)).toBeUndefined();
			expect(summariseInteractiveOutput(ASK_QUESTION_TOOL_NAME, value)).toBeUndefined();
		},
	);

	it('joins ask_question option labels when input + output present', () => {
		const input = {
			question: 'Where to post?',
			options: [
				{ label: 'Slack', value: 'slack' },
				{ label: 'Discord', value: 'discord' },
			],
		};
		const output = { values: ['slack', 'discord'] };
		expect(summariseInteractiveOutput(ASK_QUESTION_TOOL_NAME, output, input)).toBe(
			'Slack, Discord',
		);
	});

	it('falls back to raw values when ask_question input is missing', () => {
		expect(summariseInteractiveOutput(ASK_QUESTION_TOOL_NAME, { values: ['slack'] })).toBe('slack');
	});

	it('renders ask_credential credential name', () => {
		expect(
			summariseInteractiveOutput(ASK_CREDENTIAL_TOOL_NAME, {
				credentialId: 'c1',
				credentialName: 'My Slack',
			}),
		).toBe('My Slack');
	});

	it('renders ask_credential skip', () => {
		expect(summariseInteractiveOutput(ASK_CREDENTIAL_TOOL_NAME, { skipped: true })).toBe('Skipped');
	});

	it('renders ask_llm provider/model + credential', () => {
		expect(
			summariseInteractiveOutput(ASK_LLM_TOOL_NAME, {
				provider: 'anthropic',
				model: 'claude-sonnet-4-6',
				credentialId: 'c1',
				credentialName: 'My Anthropic',
			}),
		).toBe('anthropic/claude-sonnet-4-6 · My Anthropic');
	});
});

describe('summariseInteractiveOutput — n8n_chat_action', () => {
	const cardInput = {
		action: 'respond',
		input: {
			message: {
				card: {
					components: [
						{ type: 'button', label: 'Approve & Send', value: 'approve_send' },
						{
							type: 'radio_select',
							id: 'next_step',
							options: [{ label: 'Schedule a call', value: 'call' }],
						},
					],
				},
			},
		},
	};

	it('resolves the clicked button to its label', () => {
		expect(
			summariseInteractiveOutput(
				N8N_CHAT_ACTION_TOOL_NAME,
				{ type: 'button', value: 'approve_send' },
				cardInput,
			),
		).toBe('Approve & Send');
	});

	it('falls back to button text when label is absent (same precedence as the renderer)', () => {
		const textButtonInput = {
			action: 'respond',
			input: {
				message: {
					card: { components: [{ type: 'button', text: 'Confirm & Send', value: 'confirm' }] },
				},
			},
		};
		expect(
			summariseInteractiveOutput(
				N8N_CHAT_ACTION_TOOL_NAME,
				{ type: 'button', value: 'confirm' },
				textButtonInput,
			),
		).toBe('Confirm & Send');
	});

	it('resolves a selected option to its label', () => {
		expect(
			summariseInteractiveOutput(
				N8N_CHAT_ACTION_TOOL_NAME,
				{ type: 'select', id: 'next_step', value: 'call' },
				cardInput,
			),
		).toBe('Schedule a call');
	});

	it('falls back to the raw value when no component matches', () => {
		expect(
			summariseInteractiveOutput(
				N8N_CHAT_ACTION_TOOL_NAME,
				{ type: 'button', value: 'unknown' },
				cardInput,
			),
		).toBe('unknown');
	});

	it('returns undefined for display-only action results', () => {
		expect(
			summariseInteractiveOutput(N8N_CHAT_ACTION_TOOL_NAME, { ok: true }, cardInput),
		).toBeUndefined();
	});
});

describe('summariseToolCall', () => {
	it('does not summarise delegate_subagent; AgentChatToolSteps owns the i18n summary', () => {
		expect(
			summariseToolCall(
				DELEGATE_SUB_AGENT_TOOL_NAME,
				{ status: 'completed', answer: 'Done', model: 'anthropic/claude-haiku-4-5' },
				{ subAgentId: 'inline', taskName: 'research_api', difficulty: 'high' },
			),
		).toBeUndefined();
	});

	it('does not summarise write_todos; AgentChatToolSteps owns the i18n summary', () => {
		expect(
			summariseToolCall(WRITE_TODOS_TOOL_NAME, {
				status: 'ok',
				todoCount: 2,
				todos: [],
			}),
		).toBeUndefined();
	});
});
