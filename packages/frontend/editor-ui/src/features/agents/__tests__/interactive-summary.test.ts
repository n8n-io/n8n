import { describe, expect, it } from 'vitest';
import { N8N_CHAT_ACTION_TOOL_NAME } from '@n8n/api-types';
import { summariseToolCall } from '@/features/ai/shared/agentsChat/interactiveSummary';
import { DELEGATE_SUB_AGENT_TOOL_NAME } from '../utils/delegate-tool';
import { WRITE_TODOS_TOOL_NAME } from '../utils/write-todos-tool';

describe('summariseToolCall', () => {
	it('returns undefined for non-interactive tool names', () => {
		expect(summariseToolCall('search_nodes', { foo: 'bar' })).toBeUndefined();
	});

	it('returns undefined when output is missing', () => {
		expect(summariseToolCall(N8N_CHAT_ACTION_TOOL_NAME, undefined)).toBeUndefined();
	});

	it.each([null, 'oops', 42, true, ['x']])(
		'returns undefined for non-object output (%p)',
		(value) => {
			expect(summariseToolCall(N8N_CHAT_ACTION_TOOL_NAME, value)).toBeUndefined();
		},
	);

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

describe('summariseToolCall — n8n_chat_action', () => {
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
				textButtonInput,
			),
		).toBe('Confirm & Send');
	});

	it('resolves a selected option to its label', () => {
		expect(
			summariseToolCall(
				N8N_CHAT_ACTION_TOOL_NAME,
				{ type: 'select', id: 'next_step', value: 'call' },
				cardInput,
			),
		).toBe('Schedule a call');
	});

	it('falls back to the raw value when no component matches', () => {
		expect(
			summariseToolCall(N8N_CHAT_ACTION_TOOL_NAME, { type: 'button', value: 'unknown' }, cardInput),
		).toBe('unknown');
	});

	it('returns undefined for display-only action results', () => {
		expect(summariseToolCall(N8N_CHAT_ACTION_TOOL_NAME, { ok: true }, cardInput)).toBeUndefined();
	});
});

describe('summariseToolCall — propose_automation', () => {
	const kept = { workflowId: 'wf-1', url: 'http://localhost:5678/workflow/wf-1', kept: true };
	const toolInput = { workflowId: 'wf-1', title: 'Morning digest', why: ['Every weekday'] };

	it.each([
		['a workflow that is on', { ...kept, active: true }, "It's on"],
		['a saved workflow that is off', { ...kept, active: false }, 'Saved, switched off'],
		['a declined or blocked answer', { denied: true, message: 'Declined' }, 'Not automated'],
		[
			'a workflow that could not be turned on',
			{ ...kept, active: false, error: 'Saved, but could not turn it on' },
			"Saved, couldn't turn it on",
		],
	])('shows the outcome of %s from the tool result', (_name, output, label) => {
		expect(summariseToolCall('propose_automation', output, toolInput)).toBe(label);
	});

	it('shows nothing while the output is the answer, before the result arrives', () => {
		const answer = { kind: 'capabilityDecision', approved: true, values: { activate: true } };

		expect(summariseToolCall('propose_automation', answer, toolInput)).toBeUndefined();
	});

	it('never says it is on when the result does not say active', () => {
		expect(summariseToolCall('propose_automation', { active: true }, toolInput)).toBeUndefined();
		expect(
			summariseToolCall('propose_automation', { ...kept, active: 'true' }, toolInput),
		).toBeUndefined();
	});

	it('keeps other tools without a summary for the same output', () => {
		expect(summariseToolCall('build-workflow', { ...kept, active: true })).toBeUndefined();
		expect(summariseToolCall('search_nodes', { denied: true })).toBeUndefined();
	});
});
