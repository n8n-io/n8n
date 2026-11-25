import type { AgentPersistedMessageDto } from '@n8n/api-types';

import { convertDbMessages } from '../messageMappers';

describe('convertDbMessages — execution errors', () => {
	it('renders the recorded run error as its own error bubble after the transcript', () => {
		const dbMessages: AgentPersistedMessageDto[] = [
			{
				id: 'exec-1:assistant',
				role: 'assistant',
				content: [{ type: 'text', text: 'partial output' }],
				executionId: 'exec-1',
				executionStatus: 'error',
				executionError: 'The model stream stalled: no data received for 90 seconds.',
			},
		];

		const messages = convertDbMessages(dbMessages);

		expect(messages).toHaveLength(2);
		expect(messages[0]).toMatchObject({ content: 'partial output', status: 'error' });
		expect(messages[1]).toMatchObject({
			role: 'assistant',
			content: 'The model stream stalled: no data received for 90 seconds.',
			status: 'error',
			executionId: 'exec-1',
		});
	});

	it('renders an error bubble even when the errored turn produced no content', () => {
		const dbMessages: AgentPersistedMessageDto[] = [
			{
				id: 'exec-1:assistant',
				role: 'assistant',
				content: [],
				executionId: 'exec-1',
				executionStatus: 'error',
				executionError: 'fetch failed',
			},
		];

		const messages = convertDbMessages(dbMessages);

		const errorBubble = messages.find((m) => m.content === 'fetch failed');
		expect(errorBubble).toMatchObject({ role: 'assistant', status: 'error' });
	});

	it('adds no error bubble to successful turns', () => {
		const dbMessages: AgentPersistedMessageDto[] = [
			{
				id: 'exec-1:assistant',
				role: 'assistant',
				content: [{ type: 'text', text: 'all done' }],
				executionId: 'exec-1',
				executionStatus: 'success',
			},
		];

		expect(convertDbMessages(dbMessages)).toHaveLength(1);
	});
});

describe('convertDbMessages — stopped executions', () => {
	it('shows one stop notice after all partial output from the execution', () => {
		const dbMessages: AgentPersistedMessageDto[] = [
			{
				id: 'input',
				role: 'user',
				content: [{ type: 'text', text: 'Start' }],
				executionId: 'exec-1',
				executionStatus: 'cancelled',
			},
			{
				id: 'partial-1',
				role: 'assistant',
				content: [{ type: 'text', text: 'Working' }],
				executionId: 'exec-1',
				executionStatus: 'cancelled',
			},
			{
				id: 'partial-2',
				role: 'assistant',
				content: [{ type: 'text', text: 'More work' }],
				executionId: 'exec-1',
				executionStatus: 'cancelled',
			},
		];

		const messages = convertDbMessages(dbMessages);

		expect(messages.map(({ content }) => content)).toEqual([
			'Start',
			'Working',
			'More work',
			'Session stopped',
		]);
		expect(messages.at(-1)).toMatchObject({
			id: 'exec-1:stopped',
			role: 'assistant',
			executionId: 'exec-1',
		});
	});

	it('shows a notice when the execution stopped before any assistant output', () => {
		const messages = convertDbMessages([
			{
				id: 'input',
				role: 'user',
				content: [{ type: 'text', text: 'Start' }],
				executionId: 'exec-1',
			},
			{
				id: 'exec-1:assistant',
				role: 'assistant',
				content: [],
				executionId: 'exec-1',
				executionStatus: 'cancelled',
			},
		]);

		expect(messages.at(-1)).toMatchObject({ content: 'Session stopped', executionId: 'exec-1' });
	});

	it('settles unfinished tool steps while preserving completed work', () => {
		const messages = convertDbMessages([
			{
				id: 'output',
				role: 'assistant',
				executionId: 'exec-1',
				executionStatus: 'cancelled',
				content: [
					{
						type: 'tool-call',
						toolCallId: 'completed',
						toolName: 'work',
						state: 'resolved',
						output: 'Done',
					},
					{ type: 'tool-call', toolCallId: 'unfinished', toolName: 'work', input: {} },
				],
			},
		]);

		expect(messages[0].toolCalls).toEqual([
			expect.objectContaining({ toolCallId: 'completed', state: 'done' }),
			expect.objectContaining({ toolCallId: 'unfinished', state: 'cancelled' }),
		]);
	});

	it('keeps the notice with the stopped execution when a later turn succeeds', () => {
		const messages = convertDbMessages([
			{
				id: 'partial',
				role: 'assistant',
				content: [],
				executionId: 'exec-1',
				executionStatus: 'cancelled',
			},
			{
				id: 'later',
				role: 'assistant',
				content: [{ type: 'text', text: 'Done' }],
				executionId: 'exec-2',
				executionStatus: 'success',
			},
		]);

		expect(messages.map(({ content }) => content)).toEqual(['', 'Session stopped', 'Done']);
	});
});
