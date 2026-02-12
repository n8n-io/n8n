import type { StreamEvent } from '@langchain/core/dist/tracers/event_stream';
import type { IterableReadableStream } from '@langchain/core/dist/utils/stream';
import type { IExecuteFunctions } from 'n8n-workflow';

import { processEventStream } from '../processEventStream';

/**
 * Creates a mock IterableReadableStream from an array of StreamEvents.
 */
function createMockEventStream(events: StreamEvent[]): IterableReadableStream<StreamEvent> {
	return {
		async *[Symbol.asyncIterator]() {
			for (const event of events) {
				yield event;
			}
		},
	} as IterableReadableStream<StreamEvent>;
}

/**
 * Creates a minimal mock IExecuteFunctions for testing.
 */
function createMockCtx(): IExecuteFunctions {
	return {
		sendChunk: jest.fn(),
	} as unknown as IExecuteFunctions;
}

describe('processEventStream', () => {
	describe('on_chat_model_end validation', () => {
		it('should skip events with null output', async () => {
			const ctx = createMockCtx();
			const events: StreamEvent[] = [
				{
					event: 'on_chat_model_end',
					data: { output: null },
					name: 'test',
					run_id: 'test-1',
					tags: [],
					metadata: {},
				},
			];

			const result = await processEventStream(ctx, createMockEventStream(events), 0);

			expect(result.output).toBe('');
			expect(result.toolCalls).toBeUndefined();
		});

		it('should skip events with undefined output', async () => {
			const ctx = createMockCtx();
			const events: StreamEvent[] = [
				{
					event: 'on_chat_model_end',
					data: { output: undefined },
					name: 'test',
					run_id: 'test-2',
					tags: [],
					metadata: {},
				},
			];

			const result = await processEventStream(ctx, createMockEventStream(events), 0);

			expect(result.output).toBe('');
			expect(result.toolCalls).toBeUndefined();
		});

		it('should skip events with non-object output (string)', async () => {
			const ctx = createMockCtx();
			const events: StreamEvent[] = [
				{
					event: 'on_chat_model_end',
					data: { output: 'some string' },
					name: 'test',
					run_id: 'test-3',
					tags: [],
					metadata: {},
				},
			];

			const result = await processEventStream(ctx, createMockEventStream(events), 0);

			expect(result.output).toBe('');
			expect(result.toolCalls).toBeUndefined();
		});

		it('should skip tool calls with missing name field', async () => {
			const ctx = createMockCtx();
			const events: StreamEvent[] = [
				{
					event: 'on_chat_model_end',
					data: {
						output: {
							content: 'test',
							tool_calls: [
								{ name: '', args: {}, id: 'call_1' },
								{ name: undefined, args: {}, id: 'call_2' },
								{ name: 'valid_tool', args: { x: 1 }, id: 'call_3' },
							],
						},
					},
					name: 'test',
					run_id: 'test-4',
					tags: [],
					metadata: {},
				},
			];

			const result = await processEventStream(ctx, createMockEventStream(events), 0);

			// Only the valid tool call should be collected
			expect(result.toolCalls).toHaveLength(1);
			expect(result.toolCalls![0].tool).toBe('valid_tool');
			expect(result.toolCalls![0].toolCallId).toBe('call_3');
		});

		it('should handle tool calls with undefined args gracefully', async () => {
			const ctx = createMockCtx();
			const events: StreamEvent[] = [
				{
					event: 'on_chat_model_end',
					data: {
						output: {
							content: '',
							tool_calls: [{ name: 'my_tool', args: undefined, id: 'call_1' }],
						},
					},
					name: 'test',
					run_id: 'test-5',
					tags: [],
					metadata: {},
				},
			];

			const result = await processEventStream(ctx, createMockEventStream(events), 0);

			expect(result.toolCalls).toHaveLength(1);
			expect(result.toolCalls![0].toolInput).toEqual({});
		});

		/**
		 * This test verifies the fix for the Gemini "content.parts" crash.
		 *
		 * On the BUGGY version, malformed on_chat_model_end events with
		 * non-array tool_calls would cause Array methods to throw.
		 *
		 * On the FIXED version, the explicit Array.isArray check prevents this.
		 */
		it('should handle non-array tool_calls gracefully', async () => {
			const ctx = createMockCtx();
			const events: StreamEvent[] = [
				{
					event: 'on_chat_model_end',
					data: {
						output: {
							content: 'test output',
							tool_calls: 'not-an-array',
						},
					},
					name: 'test',
					run_id: 'test-6',
					tags: [],
					metadata: {},
				},
			];

			const result = await processEventStream(ctx, createMockEventStream(events), 0);

			expect(result.output).toBe('');
			expect(result.toolCalls).toBeUndefined();
		});
	});

	describe('on_chat_model_stream validation', () => {
		it('should handle valid string content chunks', async () => {
			const ctx = createMockCtx();
			const events: StreamEvent[] = [
				{
					event: 'on_chat_model_stream',
					data: { chunk: { content: 'Hello ' } },
					name: 'test',
					run_id: 'test-7',
					tags: [],
					metadata: {},
				},
				{
					event: 'on_chat_model_stream',
					data: { chunk: { content: 'world' } },
					name: 'test',
					run_id: 'test-8',
					tags: [],
					metadata: {},
				},
			];

			const result = await processEventStream(ctx, createMockEventStream(events), 0);

			expect(result.output).toBe('Hello world');
		});

		it('should handle chunks with undefined content gracefully', async () => {
			const ctx = createMockCtx();
			const events: StreamEvent[] = [
				{
					event: 'on_chat_model_stream',
					data: { chunk: { content: undefined } },
					name: 'test',
					run_id: 'test-9',
					tags: [],
					metadata: {},
				},
			];

			const result = await processEventStream(ctx, createMockEventStream(events), 0);

			expect(result.output).toBe('');
		});

		it('should handle chunks with null data gracefully', async () => {
			const ctx = createMockCtx();
			const events: StreamEvent[] = [
				{
					event: 'on_chat_model_stream',
					data: null as unknown as Record<string, unknown>,
					name: 'test',
					run_id: 'test-10',
					tags: [],
					metadata: {},
				},
			];

			const result = await processEventStream(ctx, createMockEventStream(events), 0);

			expect(result.output).toBe('');
		});
	});

	describe('valid tool call extraction', () => {
		it('should correctly extract well-formed tool calls', async () => {
			const ctx = createMockCtx();
			const mockOutput = {
				content: 'Calling tools',
				tool_calls: [
					{
						name: 'calculator',
						args: { expression: '2+2' },
						id: 'call_abc123',
						type: 'tool_call',
					},
				],
				additional_kwargs: { test: true },
			};

			const events: StreamEvent[] = [
				{
					event: 'on_chat_model_end',
					data: { output: mockOutput },
					name: 'test',
					run_id: 'test-11',
					tags: [],
					metadata: {},
				},
			];

			const result = await processEventStream(ctx, createMockEventStream(events), 0);

			expect(result.toolCalls).toHaveLength(1);
			expect(result.toolCalls![0]).toEqual({
				tool: 'calculator',
				toolInput: { expression: '2+2' },
				toolCallId: 'call_abc123',
				type: 'tool_call',
				log: 'Calling tools',
				messageLog: [mockOutput],
				additionalKwargs: { test: true },
			});
		});
	});
});
