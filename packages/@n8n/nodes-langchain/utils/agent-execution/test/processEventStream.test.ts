import type { MessageContent, ToolCall } from '@langchain/core/messages';
import { AIMessage, AIMessageChunk } from '@langchain/core/messages';
import type { StreamEvent } from '@langchain/core/types/stream';
import type { IterableReadableStream } from '@langchain/core/utils/stream';
import type { IExecuteFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { processEventStream } from '../processEventStream';

function toStream(events: StreamEvent[]): IterableReadableStream<StreamEvent> {
	return (async function* () {
		for (const event of events) {
			yield event;
		}
	})() as unknown as IterableReadableStream<StreamEvent>;
}

// Real message instances, because the code reads `.text` — a getter a plain object lacks
function streamChunk(content: MessageContent): StreamEvent {
	return {
		event: 'on_chat_model_stream',
		data: { chunk: new AIMessageChunk({ content }) },
	} as unknown as StreamEvent;
}

function modelEnd(fields: { content: MessageContent; tool_calls?: ToolCall[] }): StreamEvent {
	return {
		event: 'on_chat_model_end',
		data: { output: new AIMessage(fields) },
	} as unknown as StreamEvent;
}

describe('processEventStream', () => {
	let ctx: IExecuteFunctions;

	beforeEach(() => {
		ctx = mock<IExecuteFunctions>();
	});

	it('streams a plain final answer and returns it as output', async () => {
		const result = await processEventStream(
			ctx,
			toStream([streamChunk('All '), streamChunk('done!'), modelEnd({ content: 'All done!' })]),
			0,
		);

		expect(result.output).toBe('All done!');
		expect(result.toolCalls).toBeUndefined();
		expect(ctx.sendChunk).toHaveBeenCalledWith('begin', 0);
		expect(ctx.sendChunk).toHaveBeenCalledWith('item', 0, 'All ');
		expect(ctx.sendChunk).toHaveBeenCalledWith('item', 0, 'done!');
		expect(ctx.sendChunk).toHaveBeenCalledWith('end', 0);
	});

	it('collects tool calls from a turn that only requests tools', async () => {
		const result = await processEventStream(
			ctx,
			toStream([
				modelEnd({
					content: '',
					tool_calls: [{ name: 'create_repair_order', args: { room: '1101' }, id: 'call-1' }],
				}),
			]),
			0,
		);

		expect(result.toolCalls).toHaveLength(1);
		expect(result.toolCalls?.[0]).toMatchObject({
			tool: 'create_repair_order',
			toolInput: { room: '1101' },
			toolCallId: 'call-1',
		});
	});

	it('extracts text from content blocks rather than the whole block array', async () => {
		const result = await processEventStream(
			ctx,
			toStream([
				streamChunk([
					{ type: 'text', text: 'Room 1101' },
					{ type: 'image_url', image_url: { url: 'https://example.com/a.png' } },
				]),
				modelEnd({ content: [{ type: 'text', text: 'Room 1101' }] }),
			]),
			0,
		);

		expect(result.output).toBe('Room 1101');
		expect(ctx.sendChunk).toHaveBeenCalledWith('item', 0, 'Room 1101');
	});

	describe('mixed text + tool_use turns', () => {
		it('keeps the tool call when the turn also produced text', async () => {
			const result = await processEventStream(
				ctx,
				toStream([
					streamChunk([{ type: 'text', text: 'Room 1101' }]),
					modelEnd({
						content: [
							{ type: 'text', text: 'Room 1101' },
							{ type: 'tool_use', id: 'call-1', name: 'create_repair_order', input: {} },
						],
						tool_calls: [{ name: 'create_repair_order', args: { room: '1101' }, id: 'call-1' }],
					}),
				]),
				0,
			);

			expect(result.toolCalls).toHaveLength(1);
			expect(result.toolCalls?.[0].tool).toBe('create_repair_order');
		});

		it('records log as text, not the raw content-block array', async () => {
			const result = await processEventStream(
				ctx,
				toStream([
					modelEnd({
						content: [
							{ type: 'text', text: 'Room 1101' },
							{ type: 'tool_use', id: 'call-1', name: 'create_repair_order', input: {} },
						],
						tool_calls: [{ name: 'create_repair_order', args: { room: '1101' }, id: 'call-1' }],
					}),
				]),
				0,
			);

			expect(typeof result.toolCalls?.[0].log).toBe('string');
			expect(result.toolCalls?.[0].log).toBe('Room 1101');
		});

		it('falls back to a generated log when the turn produced no text', async () => {
			const result = await processEventStream(
				ctx,
				toStream([
					modelEnd({
						content: [],
						tool_calls: [{ name: 'create_repair_order', args: { room: '1101' }, id: 'call-1' }],
					}),
				]),
				0,
			);

			expect(result.toolCalls?.[0].log).toBe(
				'Calling create_repair_order with input: {"room":"1101"}',
			);
		});
	});
});
