import { describe, expect, it } from 'vitest';
import { N8N_CHAT_ACTION_TOOL_NAME } from '@n8n/api-types';
import {
	summariseToolCall,
	type SummaryI18n,
} from '@/features/ai/shared/agentsChat/interactiveSummary';
import { DELEGATE_SUB_AGENT_TOOL_NAME } from '../utils/delegate-tool';
import { WRITE_TODOS_TOOL_NAME } from '../utils/write-todos-tool';

function createSummaryI18n(): SummaryI18n {
	return {
		baseText: (key: string) => key,
	} as SummaryI18n;
}

describe('summariseToolCall', () => {
	const i18n = createSummaryI18n();

	it('returns undefined for non-interactive tool names', () => {
		expect(summariseToolCall('search_nodes', { foo: 'bar' }, i18n)).toBeUndefined();
	});

	it('returns undefined when output is missing', () => {
		expect(summariseToolCall(N8N_CHAT_ACTION_TOOL_NAME, undefined, i18n)).toBeUndefined();
	});

	it.each([null, 'oops', 42, true, ['x']])(
		'returns undefined for non-object output (%p)',
		(value) => {
			expect(summariseToolCall(N8N_CHAT_ACTION_TOOL_NAME, value, i18n)).toBeUndefined();
		},
	);

	it('does not summarise delegate_subagent; AgentChatToolSteps owns the i18n summary', () => {
		expect(
			summariseToolCall(
				DELEGATE_SUB_AGENT_TOOL_NAME,
				{ status: 'completed', answer: 'Done', model: 'anthropic/claude-haiku-4-5' },
				i18n,
				{ subAgentId: 'inline', taskName: 'research_api', difficulty: 'high' },
			),
		).toBeUndefined();
	});

	it('does not summarise write_todos; AgentChatToolSteps owns the i18n summary', () => {
		expect(
			summariseToolCall(
				WRITE_TODOS_TOOL_NAME,
				{
					status: 'ok',
					todoCount: 2,
					todos: [],
				},
				i18n,
			),
		).toBeUndefined();
	});
});

describe('summariseToolCall — n8n_chat_action', () => {
	const i18n = createSummaryI18n();
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
			summariseToolCall(
				N8N_CHAT_ACTION_TOOL_NAME,
				{ type: 'button', value: 'approve_send' },
				i18n,
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
			summariseToolCall(
				N8N_CHAT_ACTION_TOOL_NAME,
				{ type: 'button', value: 'confirm' },
				i18n,
				textButtonInput,
			),
		).toBe('Confirm & Send');
	});

	it('resolves a selected option to its label', () => {
		expect(
			summariseToolCall(
				N8N_CHAT_ACTION_TOOL_NAME,
				{ type: 'select', id: 'next_step', value: 'call' },
				i18n,
				cardInput,
			),
		).toBe('Schedule a call');
	});

	it('falls back to the raw value when no component matches', () => {
		expect(
			summariseToolCall(
				N8N_CHAT_ACTION_TOOL_NAME,
				{ type: 'button', value: 'unknown' },
				i18n,
				cardInput,
			),
		).toBe('unknown');
	});

	it('returns undefined for display-only action results', () => {
		expect(
			summariseToolCall(N8N_CHAT_ACTION_TOOL_NAME, { ok: true }, i18n, cardInput),
		).toBeUndefined();
	});
});
