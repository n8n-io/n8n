import {
	AIMessage,
	type BaseMessage,
	HumanMessage,
	SystemMessage,
	ToolMessage,
} from '@langchain/core/messages';

import { fromLcMessage, toLcMessage } from '../../converters/message';
import type { Message } from '../../types/message';

/**
 * Round-trip tests: n8n -> LC -> n8n (toLcMessage then fromLcMessage)
 *
 * Verifies that converting an n8n Message to LangChain and back
 * produces the same message.
 */
describe('message round-trip: n8n -> LC -> n8n', () => {
	function roundTrip(original: Message): Message {
		const lc = toLcMessage(original);
		return fromLcMessage(lc);
	}

	describe('system messages', () => {
		it('should round-trip a simple text message', () => {
			const original: Message = {
				role: 'system',
				content: [{ type: 'text', text: 'You are a helpful assistant' }],
			};

			expect(roundTrip(original)).toEqual(original);
		});

		it('should preserve id and name', () => {
			const original: Message = {
				role: 'system',
				content: [{ type: 'text', text: 'System prompt' }],
				id: 'msg-123',
				name: 'system-bot',
			};

			expect(roundTrip(original)).toEqual(original);
		});
	});

	describe('human messages', () => {
		it('should round-trip a simple text message', () => {
			const original: Message = {
				role: 'user',
				content: [{ type: 'text', text: 'Hello!' }],
			};

			expect(roundTrip(original)).toEqual(original);
		});

		it('should round-trip multiple text blocks', () => {
			const original: Message = {
				role: 'user',
				content: [
					{ type: 'text', text: 'First part' },
					{ type: 'text', text: 'Second part' },
				],
			};

			expect(roundTrip(original)).toEqual(original);
		});

		it('should preserve id and name', () => {
			const original: Message = {
				role: 'user',
				content: [{ type: 'text', text: 'Hello' }],
				id: 'msg-456',
				name: 'user-1',
			};

			expect(roundTrip(original)).toEqual(original);
		});

		it('should round-trip a file content block', () => {
			const original: Message = {
				role: 'user',
				content: [
					{
						type: 'file',
						mediaType: 'image/png',
						data: 'iVBORw0KGgo=',
					},
				],
			};

			expect(roundTrip(original)).toEqual(original);
		});

		it('should round-trip a file with url in providerMetadata', () => {
			const original: Message = {
				role: 'user',
				content: [
					{
						type: 'file',
						mediaType: 'image/jpeg',
						data: '/9j/4AAQ==',
						providerMetadata: {
							url: 'https://example.com/image.jpg',
							fileId: 'file-123',
						},
					},
				],
			};

			expect(roundTrip(original)).toEqual(original);
		});
	});

	describe('ai messages', () => {
		it('should round-trip a simple text response', () => {
			const original: Message = {
				role: 'assistant',
				content: [{ type: 'text', text: 'Hello! How can I help you?' }],
			};

			expect(roundTrip(original)).toEqual(original);
		});

		it('should round-trip a reasoning block', () => {
			const original: Message = {
				role: 'assistant',
				content: [
					{ type: 'reasoning', text: 'Let me think about this...' },
					{ type: 'text', text: 'The answer is 42.' },
				],
			};

			expect(roundTrip(original)).toEqual(original);
		});

		it('should round-trip an AI message with tool calls', () => {
			const original: Message = {
				role: 'assistant',
				content: [
					{ type: 'text', text: 'Let me look that up.' },
					{
						type: 'tool-call',
						toolCallId: 'call-1',
						toolName: 'search',
						input: '{"query":"weather"}',
					},
				],
			};

			const result = roundTrip(original);

			// Content order may differ: fromLcMessage appends tool calls after content
			expect(result.role).toBe('assistant');
			expect(result.content).toHaveLength(2);

			const textBlock = result.content.find((c) => c.type === 'text');
			expect(textBlock).toEqual({ type: 'text', text: 'Let me look that up.' });

			const toolCallBlock = result.content.find((c) => c.type === 'tool-call');
			expect(toolCallBlock).toMatchObject({
				type: 'tool-call',
				toolCallId: 'call-1',
				toolName: 'search',
				input: '{"query":"weather"}',
			});
		});

		it('should round-trip multiple tool calls', () => {
			const original: Message = {
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolCallId: 'call-1',
						toolName: 'search',
						input: '{"q":"foo"}',
					},
					{
						type: 'tool-call',
						toolCallId: 'call-2',
						toolName: 'calculator',
						input: '{"expr":"2+2"}',
					},
				],
			};

			const result = roundTrip(original);

			expect(result.role).toBe('assistant');
			const toolCalls = result.content.filter((c) => c.type === 'tool-call');
			expect(toolCalls).toHaveLength(2);
			expect(toolCalls[0]).toMatchObject({ toolCallId: 'call-1', toolName: 'search' });
			expect(toolCalls[1]).toMatchObject({ toolCallId: 'call-2', toolName: 'calculator' });
		});

		it('should round-trip an invalid tool call', () => {
			const original: Message = {
				role: 'assistant',
				content: [
					{ type: 'text', text: 'I tried to call a tool but it failed.' },
					{
						type: 'invalid-tool-call',
						toolCallId: 'call-1',
						error: 'Invalid JSON in arguments',
						args: '{"malformed": }',
						name: 'search',
					},
				],
			};

			const result = roundTrip(original);

			expect(result.role).toBe('assistant');
			expect(result.content).toHaveLength(2);

			const textBlock = result.content.find((c) => c.type === 'text');
			expect(textBlock).toEqual({ type: 'text', text: 'I tried to call a tool but it failed.' });

			const invalidToolCallBlock = result.content.find((c) => c.type === 'invalid-tool-call');
			expect(invalidToolCallBlock).toMatchObject({
				type: 'invalid-tool-call',
				toolCallId: 'call-1',
				error: 'Invalid JSON in arguments',
				args: '{"malformed": }',
				name: 'search',
			});
		});

		it('should round-trip multiple invalid tool calls', () => {
			const original: Message = {
				role: 'assistant',
				content: [
					{
						type: 'invalid-tool-call',
						toolCallId: 'call-1',
						error: 'Tool not found',
						args: '{}',
						name: 'nonexistent_tool',
					},
					{
						type: 'invalid-tool-call',
						toolCallId: 'call-2',
						error: 'Invalid arguments',
						args: '{"foo": "bar"}',
						name: 'search',
					},
				],
			};

			const result = roundTrip(original);

			expect(result.role).toBe('assistant');
			const invalidToolCalls = result.content.filter((c) => c.type === 'invalid-tool-call');
			expect(invalidToolCalls).toHaveLength(2);
			expect(invalidToolCalls[0]).toMatchObject({
				toolCallId: 'call-1',
				error: 'Tool not found',
				name: 'nonexistent_tool',
			});
			expect(invalidToolCalls[1]).toMatchObject({
				toolCallId: 'call-2',
				error: 'Invalid arguments',
				name: 'search',
			});
		});

		it('should preserve id and name', () => {
			const original: Message = {
				role: 'assistant',
				content: [{ type: 'text', text: 'Response' }],
				id: 'msg-789',
				name: 'assistant',
			};

			expect(roundTrip(original)).toEqual(original);
		});

		it('should round-trip a citation block', () => {
			const original: Message = {
				role: 'assistant',
				content: [
					{
						type: 'citation',
						source: 'web',
						url: 'https://example.com',
						title: 'Example Page',
						startIndex: 0,
						endIndex: 10,
						text: 'cited text',
					},
					{ type: 'text', text: 'According to the source...' },
				],
			};

			expect(roundTrip(original)).toEqual(original);
		});

		it('should round-trip a provider (non-standard) block', () => {
			const original: Message = {
				role: 'assistant',
				content: [
					{ type: 'provider', value: { customField: 'customValue', nested: { a: 1 } } },
					{ type: 'text', text: 'Normal text' },
				],
			};

			expect(roundTrip(original)).toEqual(original);
		});
	});

	describe('tool messages', () => {
		it('should round-trip a tool result with string content', () => {
			const original: Message = {
				role: 'tool',
				content: [
					{
						type: 'tool-result',
						toolCallId: 'call-1',
						result: 'The weather is sunny',
						isError: false,
					},
				],
			};

			const result = roundTrip(original);

			expect(result.role).toBe('tool');
			expect(result.content).toHaveLength(1);
			expect(result.content[0]).toMatchObject({
				type: 'tool-result',
				toolCallId: 'call-1',
				result: 'The weather is sunny',
				isError: false,
			});
		});

		it('should round-trip a tool error result', () => {
			const original: Message = {
				role: 'tool',
				content: [
					{
						type: 'tool-result',
						toolCallId: 'call-1',
						result: 'Connection timeout',
						isError: true,
					},
				],
			};

			const result = roundTrip(original);

			expect(result.role).toBe('tool');
			expect(result.content[0]).toMatchObject({
				type: 'tool-result',
				toolCallId: 'call-1',
				result: 'Connection timeout',
				isError: true,
			});
		});

		it('should preserve name on tool messages', () => {
			const original: Message = {
				role: 'tool',
				content: [
					{
						type: 'tool-result',
						toolCallId: 'call-1',
						result: 'done',
					},
				],
				name: 'search-tool',
			};

			const result = roundTrip(original);

			expect(result.name).toBe('search-tool');
		});
	});
});

/**
 * Round-trip tests: LC -> n8n -> LC (fromLcMessage then toLcMessage)
 *
 * Verifies that converting a LangChain message to n8n and back
 * produces a structurally equivalent LangChain message.
 */
describe('message round-trip: LC -> n8n -> LC', () => {
	function roundTrip(original: BaseMessage): BaseMessage {
		const n8n = fromLcMessage(original);
		return toLcMessage(n8n);
	}

	// LangChain messages carry extra internal fields (lc_*, kwargs, etc).
	// We compare only the semantically meaningful properties.
	//
	// Plain string content normalizes to structured content blocks during
	// round-trip (fromLcMessage wraps strings in { type: 'text', text }),
	// so we normalize before comparing.

	function normalizeContent(
		content: string | Array<Record<string, unknown>>,
	): Array<Record<string, unknown>> {
		if (typeof content === 'string') {
			return [{ type: 'text', text: content }];
		}
		return content;
	}

	function expectLcEqual(actual: BaseMessage, expected: BaseMessage) {
		expect(actual.constructor.name).toBe(expected.constructor.name);
		expect(normalizeContent(actual.content as string | Array<Record<string, unknown>>)).toEqual(
			normalizeContent(expected.content as string | Array<Record<string, unknown>>),
		);
		expect(actual.name).toBe(expected.name);

		if ('tool_call_id' in expected) {
			expect((actual as ToolMessage).tool_call_id).toBe((expected as ToolMessage).tool_call_id);
		}
		if ('tool_calls' in expected && (expected as AIMessage).tool_calls?.length) {
			expect((actual as AIMessage).tool_calls).toEqual((expected as AIMessage).tool_calls);
		}
		if ('status' in expected) {
			expect((actual as ToolMessage).status).toBe((expected as ToolMessage).status);
		}
	}

	describe('SystemMessage', () => {
		it('should round-trip a plain text SystemMessage', () => {
			const original = new SystemMessage({
				content: 'You are a helpful assistant',
				name: 'sys',
			});

			expectLcEqual(roundTrip(original), original);
		});

		it('should round-trip a SystemMessage with structured content', () => {
			const original = new SystemMessage({
				content: [{ type: 'text', text: 'System instructions' }],
			});

			expectLcEqual(roundTrip(original), original);
		});
	});

	describe('HumanMessage', () => {
		it('should round-trip a plain text HumanMessage', () => {
			const original = new HumanMessage({ content: 'Hello!', name: 'user' });

			expectLcEqual(roundTrip(original), original);
		});

		it('should round-trip a HumanMessage with structured content', () => {
			const original = new HumanMessage({
				content: [
					{ type: 'text', text: 'Look at this image' },
					{
						type: 'file',
						mimeType: 'image/png',
						data: 'base64data',
					},
				],
			});

			expectLcEqual(roundTrip(original), original);
		});
	});

	describe('AIMessage', () => {
		it('should round-trip a plain text AIMessage', () => {
			const original = new AIMessage({
				content: 'Hello! How can I help?',
				name: 'assistant',
			});

			expectLcEqual(roundTrip(original), original);
		});

		it('should round-trip an AIMessage with tool_calls', () => {
			const original = new AIMessage({
				content: 'Let me search for that.',
				tool_calls: [
					{ type: 'tool_call', id: 'call-1', name: 'search', args: { query: 'weather' } },
				],
			});

			const result = roundTrip(original);

			expect(result).toBeInstanceOf(AIMessage);
			expect((result as AIMessage).tool_calls).toEqual(original.tool_calls);
		});

		it('should round-trip an AIMessage with invalid_tool_call content', () => {
			const original = new AIMessage({
				content: [
					{ type: 'text', text: 'I tried to call a tool but encountered an error.' },
					{
						type: 'invalid_tool_call',
						id: 'call-1',
						error: 'Invalid JSON in arguments',
						args: '{"malformed": }',
						name: 'search',
					},
				],
			});

			const result = roundTrip(original);

			expect(result).toBeInstanceOf(AIMessage);
			const content = normalizeContent(result.content as string | Array<Record<string, unknown>>);

			const invalidToolCall = content.find((c) => c.type === 'invalid_tool_call');
			expect(invalidToolCall).toMatchObject({
				type: 'invalid_tool_call',
				id: 'call-1',
				error: 'Invalid JSON in arguments',
				args: '{"malformed": }',
				name: 'search',
			});
		});
	});

	describe('ToolMessage', () => {
		it('should round-trip a ToolMessage with string content', () => {
			const original = new ToolMessage({
				content: 'The weather is sunny',
				tool_call_id: 'call-1',
				status: 'success',
			});

			expectLcEqual(roundTrip(original), original);
		});

		it('should round-trip a ToolMessage with error status', () => {
			const original = new ToolMessage({
				content: 'Connection timeout',
				tool_call_id: 'call-1',
				status: 'error',
			});

			expectLcEqual(roundTrip(original), original);
		});

		it('should round-trip a ToolMessage with name', () => {
			const original = new ToolMessage({
				content: 'result',
				tool_call_id: 'call-1',
				name: 'search',
				status: 'success',
			});

			expectLcEqual(roundTrip(original), original);
		});
	});
});
