import type { StreamEvent } from '@langchain/core/types/stream';
import type { IterableReadableStream } from '@langchain/core/utils/stream';
import type { IExecuteFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { processEventStream } from './processEventStream';

function eventStream(events: StreamEvent[]): IterableReadableStream<StreamEvent> {
	return (async function* () {
		for (const event of events) yield event;
	})() as IterableReadableStream<StreamEvent>;
}

function streamEvent(runId: string, content: unknown): StreamEvent {
	return {
		event: 'on_chat_model_stream',
		run_id: runId,
		data: { chunk: { content } },
	} as StreamEvent;
}

function endEvent(runId: string, output: unknown): StreamEvent {
	return {
		event: 'on_chat_model_end',
		run_id: runId,
		data: { output },
	} as StreamEvent;
}

describe('processEventStream', () => {
	it('emits final response chunks after the model turn completes', async () => {
		const ctx = mock<IExecuteFunctions>();
		const events = eventStream([
			streamEvent('final-turn', 'Hello '),
			streamEvent('final-turn', 'world'),
			endEvent('final-turn', { content: 'Hello world', tool_calls: [] }),
		]);

		const result = await processEventStream(ctx, events, 0);

		expect(ctx.sendChunk.mock.calls).toEqual([
			['begin', 0],
			['item', 0, 'Hello '],
			['item', 0, 'world'],
			['end', 0],
		]);
		expect(result).toEqual({ output: 'Hello world' });
	});

	it('discards text from a model turn that contains tool calls', async () => {
		const ctx = mock<IExecuteFunctions>();
		const toolCall = {
			name: 'search',
			args: { query: 'schedule' },
			id: 'call-1',
			type: 'tool_call',
		};
		const output = {
			content: [
				{ type: 'text', text: 'Calling search' },
				{ type: 'tool_use', id: 'call-1', name: 'search', input: toolCall.args },
			],
			tool_calls: [toolCall],
		};
		const events = eventStream([
			streamEvent('tool-turn', [{ type: 'text', text: 'Calling search' }]),
			endEvent('tool-turn', output),
		]);

		const result = await processEventStream(ctx, events, 0);

		expect(ctx.sendChunk.mock.calls).toEqual([
			['begin', 0],
			['end', 0],
		]);
		expect(result).toEqual({
			output: '',
			toolCalls: [
				{
					tool: 'search',
					toolInput: { query: 'schedule' },
					toolCallId: 'call-1',
					type: 'tool_call',
					log: output.content,
					messageLog: [output],
					additionalKwargs: undefined,
				},
			],
		});
	});

	it('keeps concurrent model turn text isolated by run ID', async () => {
		const ctx = mock<IExecuteFunctions>();
		const events = eventStream([
			streamEvent('tool-turn', 'Calling tool'),
			streamEvent('final-turn', 'Final answer'),
			endEvent('tool-turn', {
				content: 'Calling tool',
				tool_calls: [{ name: 'search', args: {}, id: 'call-1', type: 'tool_call' }],
			}),
			endEvent('final-turn', { content: 'Final answer', tool_calls: [] }),
		]);

		const result = await processEventStream(ctx, events, 0);

		expect(ctx.sendChunk).toHaveBeenCalledWith('item', 0, 'Final answer');
		expect(ctx.sendChunk).not.toHaveBeenCalledWith('item', 0, 'Calling tool');
		expect(result.output).toBe('Final answer');
	});

	it('discards text from a model run that does not complete', async () => {
		const ctx = mock<IExecuteFunctions>();
		const events = eventStream([streamEvent('unfinished-turn', 'Partial response')]);

		const result = await processEventStream(ctx, events, 0);

		expect(ctx.sendChunk.mock.calls).toEqual([
			['begin', 0],
			['end', 0],
		]);
		expect(result.output).toBe('');
	});

	it('does not mix an incomplete primary response into a completed fallback response', async () => {
		const ctx = mock<IExecuteFunctions>();
		const events = eventStream([
			streamEvent('primary-turn', 'Partial primary response'),
			streamEvent('fallback-turn', 'Fallback response'),
			endEvent('fallback-turn', { content: 'Fallback response', tool_calls: [] }),
		]);

		const result = await processEventStream(ctx, events, 0);

		expect(ctx.sendChunk.mock.calls).toEqual([
			['begin', 0],
			['item', 0, 'Fallback response'],
			['end', 0],
		]);
		expect(result.output).toBe('Fallback response');
	});
});
