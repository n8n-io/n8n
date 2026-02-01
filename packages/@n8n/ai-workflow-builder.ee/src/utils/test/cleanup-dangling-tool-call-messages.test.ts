import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage, HumanMessage, RemoveMessage, ToolMessage } from '@langchain/core/messages';

import { cleanupDanglingToolCallMessages } from '../cleanup-dangling-tool-call-messages';

describe('cleanupDanglingToolCallMessages', () => {
	it('should remove AI messages with dangling tool calls', () => {
		const messages = [
			new AIMessage({
				id: 'ai-1',
				content: 'Calling tool',
				tool_calls: [{ id: 'dangling-1', name: 'test_tool', args: {} }],
			}),
		];

		const result = cleanupDanglingToolCallMessages(messages);

		expect(result).toHaveLength(1);
		expect(result[0]).toBeInstanceOf(RemoveMessage);
		expect(result[0].id).toBe('ai-1');
	});

	it('should not remove AI messages when tool calls are completed', () => {
		const messages = [
			new AIMessage({
				id: 'ai-1',
				content: 'Calling tool',
				tool_calls: [{ id: 'completed-1', name: 'test_tool', args: {} }],
			}),
			new ToolMessage({ id: 'tool-1', content: 'Result', tool_call_id: 'completed-1' }),
		];

		const result = cleanupDanglingToolCallMessages(messages);

		expect(result).toHaveLength(0);
	});

	it('should handle AI messages with multiple tool calls where some are dangling', () => {
		const messages = [
			new AIMessage({
				id: 'ai-1',
				content: 'Multiple calls',
				tool_calls: [
					{ id: 'completed-1', name: 'tool1', args: {} },
					{ id: 'dangling-1', name: 'tool2', args: {} },
					{ id: 'dangling-2', name: 'tool3', args: {} },
				],
			}),
			new ToolMessage({ id: 'tool-1', content: 'Result', tool_call_id: 'completed-1' }),
		];

		const result = cleanupDanglingToolCallMessages(messages);

		expect(result).toHaveLength(1);
		expect(result[0]).toBeInstanceOf(RemoveMessage);
		expect(result[0].id).toBe('ai-1');
	});

	it('should handle empty message history', () => {
		const messages: BaseMessage[] = [];

		const result = cleanupDanglingToolCallMessages(messages);

		expect(result).toHaveLength(0);
	});

	it('should handle messages without tool calls', () => {
		const messages = [
			new HumanMessage({ id: 'human-1', content: 'Hello' }),
			new AIMessage({ id: 'ai-1', content: 'Response' }),
		];

		const result = cleanupDanglingToolCallMessages(messages);

		expect(result).toHaveLength(0);
	});

	it('should handle multiple AI messages with mixed dangling/completed tool calls', () => {
		const messages = [
			new AIMessage({
				id: 'ai-1',
				content: 'First call',
				tool_calls: [{ id: 'completed-1', name: 'tool1', args: {} }],
			}),
			new ToolMessage({ id: 'tool-1', content: 'Result 1', tool_call_id: 'completed-1' }),
			new AIMessage({
				id: 'ai-2',
				content: 'Second call',
				tool_calls: [{ id: 'dangling-1', name: 'tool2', args: {} }],
			}),
			new HumanMessage({ id: 'human-1', content: 'Continue' }),
		];

		const result = cleanupDanglingToolCallMessages(messages);

		expect(result).toHaveLength(1);
		expect(result[0]).toBeInstanceOf(RemoveMessage);
		expect(result[0].id).toBe('ai-2');
	});

	it('should remove all AI messages with dangling tool calls', () => {
		const messages = [
			new AIMessage({
				id: 'ai-1',
				content: 'First dangling',
				tool_calls: [{ id: 'dangling-1', name: 'tool1', args: {} }],
			}),
			new AIMessage({
				id: 'ai-2',
				content: 'Second dangling',
				tool_calls: [{ id: 'dangling-2', name: 'tool2', args: {} }],
			}),
		];

		const result = cleanupDanglingToolCallMessages(messages);

		expect(result).toHaveLength(2);
		expect(result[0]).toBeInstanceOf(RemoveMessage);
		expect(result[0].id).toBe('ai-1');
		expect(result[1]).toBeInstanceOf(RemoveMessage);
		expect(result[1].id).toBe('ai-2');
	});
});
