import type { StreamEvent } from '@langchain/core/dist/tracers/event_stream';
import type { IterableReadableStream } from '@langchain/core/dist/utils/stream';
import type { IExecuteFunctions } from 'n8n-workflow';

import { processEventStream } from '../processEventStream';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStream(events: StreamEvent[]): IterableReadableStream<StreamEvent> {
	return (async function* () {
		for (const e of events) yield e;
	})() as unknown as IterableReadableStream<StreamEvent>;
}

function makeChatModelStreamEvent(text: string): StreamEvent {
	return {
		event: 'on_chat_model_stream',
		data: {
			chunk: {
				content: text,
			},
		},
	} as unknown as StreamEvent;
}

function makeChatModelEndEvent(opts: {
	content?: string;
	toolCalls?: Array<{ name: string; args: Record<string, unknown>; id?: string; type?: string }>;
	additionalKwargs?: Record<string, unknown>;
}): StreamEvent {
	return {
		event: 'on_chat_model_end',
		data: {
			output: {
				content: opts.content ?? '',
				tool_calls: opts.toolCalls ?? [],
				additional_kwargs: opts.additionalKwargs ?? {},
			},
		},
	} as unknown as StreamEvent;
}

function makeMockCtx() {
	const chunks: Array<{ type: string; index: number; text?: string }> = [];
	const ctx = {
		sendChunk: jest.fn((type: string, index: number, text?: string) => {
			chunks.push({ type, index, text });
		}),
	} as unknown as IExecuteFunctions;
	return { ctx, chunks };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('processEventStream', () => {
	const itemIndex = 0;

	describe('pure text response (no tool calls)', () => {
		it('streams chunks to client when there are no tool calls', async () => {
			const { ctx, chunks } = makeMockCtx();

			const events: StreamEvent[] = [
				makeChatModelStreamEvent('Hello'),
				makeChatModelStreamEvent(', world!'),
				makeChatModelEndEvent({ content: 'Hello, world!' }),
			];

			const result = await processEventStream(ctx, makeStream(events), itemIndex);

			expect(result.output).toBe('Hello, world!');
			expect(result.toolCalls).toBeUndefined();

			// begin + one item (flushed buffer) + end
			const itemChunks = chunks.filter((c) => c.type === 'item');
			expect(itemChunks).toHaveLength(1);
			expect(itemChunks[0].text).toBe('Hello, world!');
		});

		it('sends begin and end sentinel chunks', async () => {
			const { ctx, chunks } = makeMockCtx();

			const events: StreamEvent[] = [
				makeChatModelStreamEvent('Hi'),
				makeChatModelEndEvent({ content: 'Hi' }),
			];

			await processEventStream(ctx, makeStream(events), itemIndex);

			expect(chunks[0]).toMatchObject({ type: 'begin', index: itemIndex });
			expect(chunks[chunks.length - 1]).toMatchObject({ type: 'end', index: itemIndex });
		});
	});

	describe('mixed text + tool_call response', () => {
		it('discards buffered text when tool_calls are present', async () => {
			const { ctx, chunks } = makeMockCtx();

			// Model emits a reasoning token ("Room 1101") then a tool call
			const events: StreamEvent[] = [
				makeChatModelStreamEvent('Room 1101'),
				makeChatModelEndEvent({
					content: 'Room 1101',
					toolCalls: [
						{
							name: 'create_repair_order',
							args: { address: 'Room 1101', issue: 'broken AC' },
							id: 'call_abc',
							type: 'tool_call',
						},
					],
				}),
			];

			const result = await processEventStream(ctx, makeStream(events), itemIndex);

			// The pre-tool text must NOT appear in the output
			expect(result.output).toBe('');

			// No item chunks must have been sent for the pre-tool text
			const itemChunks = chunks.filter((c) => c.type === 'item');
			expect(itemChunks).toHaveLength(0);

			// Tool call must be captured correctly
			expect(result.toolCalls).toHaveLength(1);
			expect(result.toolCalls![0].tool).toBe('create_repair_order');
			expect(result.toolCalls![0].toolCallId).toBe('call_abc');
		});

		it('does not concatenate pre-tool text with subsequent final response', async () => {
			const { ctx, chunks } = makeMockCtx();

			// Turn 1: mixed text + tool call
			const turn1Events: StreamEvent[] = [
				makeChatModelStreamEvent('Intermediate text'),
				makeChatModelEndEvent({
					content: 'Intermediate text',
					toolCalls: [
						{ name: 'some_tool', args: {}, id: 'call_1', type: 'tool_call' },
					],
				}),
			];

			// Turn 2: pure final response (tool has already executed)
			const turn2Events: StreamEvent[] = [
				makeChatModelStreamEvent('Work order created!'),
				makeChatModelEndEvent({ content: 'Work order created!' }),
			];

			const result = await processEventStream(
				ctx,
				makeStream([...turn1Events, ...turn2Events]),
				itemIndex,
			);

			// Only the final text should be in output — no prepended intermediate text
			expect(result.output).toBe('Work order created!');

			const itemChunks = chunks.filter((c) => c.type === 'item');
			expect(itemChunks).toHaveLength(1);
			expect(itemChunks[0].text).toBe('Work order created!');
		});
	});

	describe('tool calls without preceding text', () => {
		it('collects tool calls when no text chunks are emitted', async () => {
			const { ctx } = makeMockCtx();

			const events: StreamEvent[] = [
				makeChatModelEndEvent({
					toolCalls: [
						{ name: 'get_weather', args: { city: 'NYC' }, id: 'call_w1', type: 'tool_call' },
						{ name: 'get_time', args: {}, id: 'call_w2', type: 'tool_call' },
					],
				}),
			];

			const result = await processEventStream(ctx, makeStream(events), itemIndex);

			expect(result.output).toBe('');
			expect(result.toolCalls).toHaveLength(2);
			expect(result.toolCalls![0].tool).toBe('get_weather');
			expect(result.toolCalls![1].tool).toBe('get_time');
		});
	});

	describe('empty stream', () => {
		it('returns empty output with no tool calls', async () => {
			const { ctx } = makeMockCtx();

			const result = await processEventStream(ctx, makeStream([]), itemIndex);

			expect(result.output).toBe('');
			expect(result.toolCalls).toBeUndefined();
		});
	});

	describe('array-format chunk content', () => {
		it('extracts text from array-typed chunk content', async () => {
			const { ctx } = makeMockCtx();

			const events: StreamEvent[] = [
				{
					event: 'on_chat_model_stream',
					data: {
						chunk: {
							content: [
								{ type: 'text', text: 'Hello ' },
								{ type: 'text', text: 'there' },
							],
						},
					},
				} as unknown as StreamEvent,
				makeChatModelEndEvent({ content: 'Hello there' }),
			];

			const result = await processEventStream(ctx, makeStream(events), itemIndex);

			expect(result.output).toBe('Hello there');
		});
	});
});
