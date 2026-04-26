import { describe, expect, it } from 'vitest';
import {
	ASK_CREDENTIAL_TOOL_NAME,
	ASK_LLM_TOOL_NAME,
	ASK_QUESTION_TOOL_NAME,
} from '@n8n/api-types';
import { summariseInteractiveOutput } from '../utils/interactive-summary';

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
				credentialName: 'My Slack OAuth',
			}),
		).toBe('My Slack OAuth');
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
