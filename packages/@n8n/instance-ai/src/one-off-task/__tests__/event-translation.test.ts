import type { InstanceAiEvent } from '@n8n/api-types';

import { createPiEventTranslator, PROGRESS_TOOL_NAME } from '../event-translation';
import type { ScrubSecret } from '../redaction';

const secrets: ScrubSecret[] = [{ value: 'sk-live-abc123', label: 'STRIPE_API_KEY' }];

function createTranslator() {
	const published: InstanceAiEvent[] = [];
	const translate = createPiEventTranslator({
		runId: 'run-1',
		agentId: 'agent-one-off-task-12345678',
		secrets,
		publish: (event) => published.push(event),
	});
	return { translate, published };
}

describe('createPiEventTranslator', () => {
	it('maps message_update text deltas to scrubbed text-delta events', () => {
		const { translate, published } = createTranslator();

		translate({
			type: 'message_update',
			assistantMessageEvent: {
				type: 'text_delta',
				contentIndex: 0,
				delta: 'using sk-live-abc123 now',
			},
		});

		expect(published).toEqual([
			{
				type: 'text-delta',
				runId: 'run-1',
				agentId: 'agent-one-off-task-12345678',
				payload: { text: 'using [REDACTED:STRIPE_API_KEY] now' },
			},
		]);
	});

	it('maps message_update thinking deltas to scrubbed reasoning-delta events', () => {
		const { translate, published } = createTranslator();

		translate({
			type: 'message_update',
			assistantMessageEvent: { type: 'thinking_delta', contentIndex: 0, delta: 'sk-live-abc123?' },
		});

		expect(published).toEqual([
			{
				type: 'reasoning-delta',
				runId: 'run-1',
				agentId: 'agent-one-off-task-12345678',
				payload: { text: '[REDACTED:STRIPE_API_KEY]?' },
			},
		]);
	});

	it('ignores non-delta message_update variants', () => {
		const { translate, published } = createTranslator();

		translate({
			type: 'message_update',
			assistantMessageEvent: { type: 'text_start', contentIndex: 0 },
		});
		translate({
			type: 'message_update',
			assistantMessageEvent: { type: 'text_end', contentIndex: 0 },
		});

		expect(published).toEqual([]);
	});

	it('maps tool_execution_start to a tool-call with scrubbed args', () => {
		const { translate, published } = createTranslator();

		translate({
			type: 'tool_execution_start',
			toolCallId: 'tc-1',
			toolName: 'bash',
			args: { command: 'curl -H "Authorization: Bearer sk-live-abc123" https://api.test' },
		});

		expect(published).toEqual([
			{
				type: 'tool-call',
				runId: 'run-1',
				agentId: 'agent-one-off-task-12345678',
				payload: {
					toolCallId: 'tc-1',
					toolName: 'bash',
					args: {
						command: 'curl -H "Authorization: Bearer [REDACTED:STRIPE_API_KEY]" https://api.test',
					},
				},
			},
		]);
	});

	it('maps tool_execution_end to a tool-result with scrubbed nested result', () => {
		const { translate, published } = createTranslator();

		translate({
			type: 'tool_execution_end',
			toolCallId: 'tc-1',
			toolName: 'bash',
			result: { output: 'token sk-live-abc123 echoed', lines: ['sk-live-abc123'] },
			isError: false,
		});

		expect(published).toEqual([
			{
				type: 'tool-result',
				runId: 'run-1',
				agentId: 'agent-one-off-task-12345678',
				payload: {
					toolCallId: 'tc-1',
					result: {
						output: 'token [REDACTED:STRIPE_API_KEY] echoed',
						lines: ['[REDACTED:STRIPE_API_KEY]'],
					},
				},
			},
		]);
	});

	it('maps failed tool_execution_end to a tool-error with a scrubbed message', () => {
		const { translate, published } = createTranslator();

		translate({
			type: 'tool_execution_end',
			toolCallId: 'tc-2',
			toolName: 'bash',
			result: '401 for key sk-live-abc123',
			isError: true,
		});

		expect(published).toEqual([
			{
				type: 'tool-error',
				runId: 'run-1',
				agentId: 'agent-one-off-task-12345678',
				payload: { toolCallId: 'tc-2', error: '401 for key [REDACTED:STRIPE_API_KEY]' },
			},
		]);
	});

	it('maps the progress tool to a scrubbed status event and swallows its end', () => {
		const { translate, published } = createTranslator();

		translate({
			type: 'tool_execution_start',
			toolCallId: 'tc-3',
			toolName: PROGRESS_TOOL_NAME,
			args: { message: 'Creating the sheet with sk-live-abc123…' },
		});
		translate({
			type: 'tool_execution_end',
			toolCallId: 'tc-3',
			toolName: PROGRESS_TOOL_NAME,
			result: 'ok',
			isError: false,
		});

		expect(published).toEqual([
			{
				type: 'status',
				runId: 'run-1',
				agentId: 'agent-one-off-task-12345678',
				payload: { message: 'Creating the sheet with [REDACTED:STRIPE_API_KEY]…' },
			},
		]);
	});

	it('ignores unknown and malformed pi events', () => {
		const { translate, published } = createTranslator();

		translate({ type: 'agent_start' });
		translate({ type: 'turn_end', message: {}, toolResults: [] });
		translate({
			type: 'tool_execution_update',
			toolCallId: 'tc-1',
			toolName: 'bash',
			partialResult: 'x',
		});
		translate('not an object');
		translate(null);
		translate({ noType: true });

		expect(published).toEqual([]);
	});
});
