import { AIMessageChunk } from '@langchain/core/messages';
import type { StreamEvent } from '@langchain/core/dist/tracers/event_stream';
import type { ToolCall } from '@langchain/core/messages/tool';
import { mock } from 'jest-mock-extended';
import type { BaseChatMemory } from 'langchain/memory';
import type { IExecuteFunctions } from 'n8n-workflow';

import { processEventStream } from '../processEventStream';

// Mock memory management functions
jest.mock('../memoryManagement', () => ({
	saveToMemory: jest.fn(),
	saveToolResultsToMemory: jest.fn(),
}));

import { saveToMemory, saveToolResultsToMemory } from '../memoryManagement';

describe('processEventStream', () => {
	let mockCtx: jest.Mocked<IExecuteFunctions>;
	let mockMemory: jest.Mocked<BaseChatMemory>;

	beforeEach(() => {
		jest.clearAllMocks();
		mockCtx = mock<IExecuteFunctions>();
		mockMemory = mock<BaseChatMemory>();
	});

	async function* createEventStream(events: StreamEvent[]): AsyncGenerator<StreamEvent> {
		for (const event of events) {
			yield event;
		}
	}

	describe('Basic streaming', () => {
		it('should process chat model stream events and send chunks', async () => {
			const events: StreamEvent[] = [
				{
					event: 'on_chat_model_stream',
					name: 'ChatModel',
					run_id: 'run_1',
					data: {
						chunk: new AIMessageChunk({
							content: 'Hello',
						}),
					},
				},
				{
					event: 'on_chat_model_stream',
					name: 'ChatModel',
					run_id: 'run_1',
					data: {
						chunk: new AIMessageChunk({
							content: ' world',
						}),
					},
				},
			];

			const result = await processEventStream(mockCtx, createEventStream(events), 0);

			expect(mockCtx.sendChunk).toHaveBeenCalledWith('begin', 0);
			expect(mockCtx.sendChunk).toHaveBeenCalledWith('item', 0, 'Hello');
			expect(mockCtx.sendChunk).toHaveBeenCalledWith('item', 0, ' world');
			expect(mockCtx.sendChunk).toHaveBeenCalledWith('end', 0);
			expect(result.output).toBe('Hello world');
		});

		it('should handle array content in chunks', async () => {
			const events: StreamEvent[] = [
				{
					event: 'on_chat_model_stream',
					name: 'ChatModel',
					run_id: 'run_1',
					data: {
						chunk: new AIMessageChunk({
							content: [
								{ type: 'text', text: 'Hello' },
								{ type: 'text', text: ' world' },
							],
						}),
					},
				},
			];

			const result = await processEventStream(mockCtx, createEventStream(events), 0);

			expect(mockCtx.sendChunk).toHaveBeenCalledWith('item', 0, 'Hello world');
			expect(result.output).toBe('Hello world');
		});

		it('should handle non-text content types in array', async () => {
			const events: StreamEvent[] = [
				{
					event: 'on_chat_model_stream',
					name: 'ChatModel',
					run_id: 'run_1',
					data: {
						chunk: new AIMessageChunk({
							content: [
								{ type: 'text', text: 'Hello' },
								{ type: 'image', data: 'base64...' },
								{ type: 'text', text: ' world' },
							],
						}),
					},
				},
			];

			const result = await processEventStream(mockCtx, createEventStream(events), 0);

			expect(result.output).toBe('Hello world');
		});

		it('should handle empty chunks', async () => {
			const events: StreamEvent[] = [
				{
					event: 'on_chat_model_stream',
					name: 'ChatModel',
					run_id: 'run_1',
					data: {
						chunk: new AIMessageChunk({
							content: '',
						}),
					},
				},
			];

			const result = await processEventStream(mockCtx, createEventStream(events), 0);

			expect(mockCtx.sendChunk).toHaveBeenCalledWith('begin', 0);
			expect(mockCtx.sendChunk).toHaveBeenCalledWith('end', 0);
			expect(result.output).toBe('');
		});
	});

	describe('Tool call handling', () => {
		it('should capture tool calls from on_chat_model_end event', async () => {
			const toolCalls: ToolCall[] = [
				{
					id: 'call_123',
					name: 'calculator',
					args: { expression: '2+2' },
					type: 'tool_call',
				},
			];

			const events: StreamEvent[] = [
				{
					event: 'on_chat_model_end',
					name: 'ChatModel',
					run_id: 'run_1',
					data: {
						output: {
							content: 'Let me calculate that',
							tool_calls: toolCalls,
						},
					},
				},
			];

			const result = await processEventStream(mockCtx, createEventStream(events), 0);

			expect(result.toolCalls).toHaveLength(1);
			expect(result.toolCalls![0]).toMatchObject({
				tool: 'calculator',
				toolInput: { expression: '2+2' },
				toolCallId: 'call_123',
				type: 'tool_call',
				log: 'Let me calculate that',
			});
		});

		it('should handle multiple tool calls', async () => {
			const toolCalls: ToolCall[] = [
				{
					id: 'call_123',
					name: 'calculator',
					args: { expression: '2+2' },
					type: 'tool_call',
				},
				{
					id: 'call_124',
					name: 'search',
					args: { query: 'TypeScript' },
					type: 'tool_call',
				},
			];

			const events: StreamEvent[] = [
				{
					event: 'on_chat_model_end',
					name: 'ChatModel',
					run_id: 'run_1',
					data: {
						output: {
							content: 'Using tools',
							tool_calls: toolCalls,
						},
					},
				},
			];

			const result = await processEventStream(mockCtx, createEventStream(events), 0);

			expect(result.toolCalls).toHaveLength(2);
			expect(result.toolCalls![0].tool).toBe('calculator');
			expect(result.toolCalls![1].tool).toBe('search');
		});

		it('should use default values for missing tool call properties', async () => {
			const toolCalls: ToolCall[] = [
				{
					id: undefined as unknown as string,
					name: 'calculator',
					args: { expression: '2+2' },
					type: undefined as unknown as string,
				},
			];

			const events: StreamEvent[] = [
				{
					event: 'on_chat_model_end',
					name: 'ChatModel',
					run_id: 'run_1',
					data: {
						output: {
							content: '',
							tool_calls: toolCalls,
						},
					},
				},
			];

			const result = await processEventStream(mockCtx, createEventStream(events), 0);

			expect(result.toolCalls).toHaveLength(1);
			expect(result.toolCalls![0].toolCallId).toBe('unknown');
			expect(result.toolCalls![0].type).toBe('tool_call');
			expect(result.toolCalls![0].log).toContain('Calling calculator');
		});
	});

	describe('Intermediate steps handling', () => {
		it('should capture intermediate steps when returnIntermediateSteps is true', async () => {
			const toolCalls: ToolCall[] = [
				{
					id: 'call_123',
					name: 'calculator',
					args: { expression: '2+2' },
					type: 'tool_call',
				},
			];

			const events: StreamEvent[] = [
				{
					event: 'on_chat_model_end',
					name: 'ChatModel',
					run_id: 'run_1',
					data: {
						output: {
							content: 'Let me calculate',
							tool_calls: toolCalls,
						},
					},
				},
				{
					event: 'on_tool_end',
					name: 'calculator',
					run_id: 'run_2',
					data: {
						output: '4',
					},
				},
			];

			const result = await processEventStream(
				mockCtx,
				createEventStream(events),
				0,
				true,
				undefined,
				'Calculate 2+2',
			);

			expect(result.intermediateSteps).toHaveLength(1);
			expect(result.intermediateSteps![0]).toMatchObject({
				action: {
					tool: 'calculator',
					toolInput: { expression: '2+2' },
					toolCallId: 'call_123',
					log: 'Let me calculate',
				},
				observation: '4',
			});
		});

		it('should not capture intermediate steps when returnIntermediateSteps is false', async () => {
			const toolCalls: ToolCall[] = [
				{
					id: 'call_123',
					name: 'calculator',
					args: { expression: '2+2' },
					type: 'tool_call',
				},
			];

			const events: StreamEvent[] = [
				{
					event: 'on_chat_model_end',
					name: 'ChatModel',
					run_id: 'run_1',
					data: {
						output: {
							content: 'Let me calculate',
							tool_calls: toolCalls,
						},
					},
				},
			];

			const result = await processEventStream(mockCtx, createEventStream(events), 0, false);

			expect(result.intermediateSteps).toBeUndefined();
		});

		it('should match tool end events with correct tool name', async () => {
			const toolCalls: ToolCall[] = [
				{
					id: 'call_123',
					name: 'calculator',
					args: { expression: '2+2' },
					type: 'tool_call',
				},
				{
					id: 'call_124',
					name: 'search',
					args: { query: 'test' },
					type: 'tool_call',
				},
			];

			const events: StreamEvent[] = [
				{
					event: 'on_chat_model_end',
					name: 'ChatModel',
					run_id: 'run_1',
					data: {
						output: {
							content: 'Using tools',
							tool_calls: toolCalls,
						},
					},
				},
				{
					event: 'on_tool_end',
					name: 'search',
					run_id: 'run_2',
					data: {
						output: 'Search results',
					},
				},
				{
					event: 'on_tool_end',
					name: 'calculator',
					run_id: 'run_3',
					data: {
						output: '4',
					},
				},
			];

			const result = await processEventStream(
				mockCtx,
				createEventStream(events),
				0,
				true,
				undefined,
				'Use tools',
			);

			expect(result.intermediateSteps).toHaveLength(2);
			expect(result.intermediateSteps![0].action.tool).toBe('calculator');
			expect(result.intermediateSteps![0].observation).toBe('4');
			expect(result.intermediateSteps![1].action.tool).toBe('search');
			expect(result.intermediateSteps![1].observation).toBe('Search results');
		});
	});

	describe('Memory handling', () => {
		it('should save conversation to memory', async () => {
			const events: StreamEvent[] = [
				{
					event: 'on_chat_model_stream',
					name: 'ChatModel',
					run_id: 'run_1',
					data: {
						chunk: new AIMessageChunk({
							content: 'Response',
						}),
					},
				},
			];

			await processEventStream(mockCtx, createEventStream(events), 0, false, mockMemory, 'Input');

			expect(saveToMemory).toHaveBeenCalledWith('Input', 'Response', mockMemory);
		});

		it('should save tool results to memory', async () => {
			const toolCalls: ToolCall[] = [
				{
					id: 'call_123',
					name: 'calculator',
					args: { expression: '2+2' },
					type: 'tool_call',
				},
			];

			const events: StreamEvent[] = [
				{
					event: 'on_chat_model_end',
					name: 'ChatModel',
					run_id: 'run_1',
					data: {
						output: {
							content: 'Calculating',
							tool_calls: toolCalls,
						},
					},
				},
				{
					event: 'on_tool_end',
					name: 'calculator',
					run_id: 'run_2',
					data: {
						output: '4',
					},
				},
			];

			await processEventStream(
				mockCtx,
				createEventStream(events),
				0,
				true,
				mockMemory,
				'Calculate 2+2',
			);

			expect(saveToolResultsToMemory).toHaveBeenCalledWith(
				'Calculate 2+2',
				[
					{
						action: expect.objectContaining({
							tool: 'calculator',
							toolInput: { expression: '2+2' },
						}),
						observation: '4',
					},
				],
				mockMemory,
			);
		});

		it('should not save to memory when input is not provided', async () => {
			const events: StreamEvent[] = [
				{
					event: 'on_chat_model_stream',
					name: 'ChatModel',
					run_id: 'run_1',
					data: {
						chunk: new AIMessageChunk({
							content: 'Response',
						}),
					},
				},
			];

			await processEventStream(mockCtx, createEventStream(events), 0, false, mockMemory);

			expect(saveToMemory).not.toHaveBeenCalled();
		});

		it('should not save to memory when memory is not provided', async () => {
			const events: StreamEvent[] = [
				{
					event: 'on_chat_model_stream',
					name: 'ChatModel',
					run_id: 'run_1',
					data: {
						chunk: new AIMessageChunk({
							content: 'Response',
						}),
					},
				},
			];

			await processEventStream(mockCtx, createEventStream(events), 0, false, undefined, 'Input');

			expect(saveToMemory).toHaveBeenCalledWith('Input', 'Response', undefined);
		});
	});

	describe('Edge cases', () => {
		it('should handle empty event stream', async () => {
			const events: StreamEvent[] = [];

			const result = await processEventStream(mockCtx, createEventStream(events), 0);

			expect(result.output).toBe('');
			expect(result.toolCalls).toBeUndefined();
			expect(mockCtx.sendChunk).toHaveBeenCalledWith('begin', 0);
			expect(mockCtx.sendChunk).toHaveBeenCalledWith('end', 0);
		});

		it('should handle events with missing data', async () => {
			const events: StreamEvent[] = [
				{
					event: 'on_chat_model_stream',
					name: 'ChatModel',
					run_id: 'run_1',
					data: undefined,
				},
				{
					event: 'on_chat_model_end',
					name: 'ChatModel',
					run_id: 'run_1',
					data: undefined,
				},
			];

			const result = await processEventStream(mockCtx, createEventStream(events), 0);

			expect(result.output).toBe('');
			expect(result.toolCalls).toBeUndefined();
		});

		it('should handle unknown event types', async () => {
			const events: StreamEvent[] = [
				{
					event: 'on_unknown_event' as any,
					name: 'Unknown',
					run_id: 'run_1',
					data: {},
				},
				{
					event: 'on_chat_model_stream',
					name: 'ChatModel',
					run_id: 'run_2',
					data: {
						chunk: new AIMessageChunk({
							content: 'Response',
						}),
					},
				},
			];

			const result = await processEventStream(mockCtx, createEventStream(events), 0);

			expect(result.output).toBe('Response');
		});

		it('should handle different item indexes', async () => {
			const events: StreamEvent[] = [
				{
					event: 'on_chat_model_stream',
					name: 'ChatModel',
					run_id: 'run_1',
					data: {
						chunk: new AIMessageChunk({
							content: 'Response',
						}),
					},
				},
			];

			await processEventStream(mockCtx, createEventStream(events), 5);

			expect(mockCtx.sendChunk).toHaveBeenCalledWith('begin', 5);
			expect(mockCtx.sendChunk).toHaveBeenCalledWith('item', 5, 'Response');
			expect(mockCtx.sendChunk).toHaveBeenCalledWith('end', 5);
		});
	});

	describe('Complex scenarios', () => {
		it('should handle complete agent execution with streaming and tools', async () => {
			const toolCalls: ToolCall[] = [
				{
					id: 'call_123',
					name: 'calculator',
					args: { expression: '2+2' },
					type: 'tool_call',
				},
			];

			const events: StreamEvent[] = [
				{
					event: 'on_chat_model_stream',
					name: 'ChatModel',
					run_id: 'run_1',
					data: {
						chunk: new AIMessageChunk({
							content: 'Let me ',
						}),
					},
				},
				{
					event: 'on_chat_model_stream',
					name: 'ChatModel',
					run_id: 'run_1',
					data: {
						chunk: new AIMessageChunk({
							content: 'calculate that',
						}),
					},
				},
				{
					event: 'on_chat_model_end',
					name: 'ChatModel',
					run_id: 'run_1',
					data: {
						output: {
							content: 'Let me calculate that',
							tool_calls: toolCalls,
						},
					},
				},
				{
					event: 'on_tool_end',
					name: 'calculator',
					run_id: 'run_2',
					data: {
						output: '4',
					},
				},
			];

			const result = await processEventStream(
				mockCtx,
				createEventStream(events),
				0,
				true,
				mockMemory,
				'What is 2+2?',
			);

			expect(result.output).toBe('Let me calculate that');
			expect(result.toolCalls).toHaveLength(1);
			expect(result.intermediateSteps).toHaveLength(1);
			expect(result.intermediateSteps![0].observation).toBe('4');
			expect(saveToMemory).toHaveBeenCalledWith(
				'What is 2+2?',
				'Let me calculate that',
				mockMemory,
			);
			expect(saveToolResultsToMemory).toHaveBeenCalled();
		});
	});
});
