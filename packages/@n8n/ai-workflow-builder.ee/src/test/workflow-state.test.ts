import { HumanMessage, AIMessage as AssistantMessage, ToolMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';

import { createTrimMessagesReducer } from '../workflow-state';

describe('createTrimMessagesReducer', () => {
	it('should return messages unchanged when human messages are within limit', () => {
		const reducer = createTrimMessagesReducer(3);
		const messages: BaseMessage[] = [
			new HumanMessage('User 1'),
			new AssistantMessage('Assistant 1'),
			new ToolMessage({ content: 'Tool 1', tool_call_id: '1' }),
			new ToolMessage({ content: 'Tool 2', tool_call_id: '2' }),
			new AssistantMessage('Assistant 2'),
		];

		const result = reducer(messages);
		expect(result).toEqual(messages);
		expect(result.length).toBe(5);
	});

	it('should trim messages when human messages exceed limit', () => {
		const reducer = createTrimMessagesReducer(3);
		const messages: BaseMessage[] = [
			new HumanMessage('User 1'),
			new AssistantMessage('Assistant 1'),
			new ToolMessage({ content: 'Tool 1', tool_call_id: '1' }),
			new HumanMessage('User 2'),
			new AssistantMessage('Assistant 2'),
			new HumanMessage('User 3'),
			new AssistantMessage('Assistant 3'),
			new HumanMessage('User 4'),
			new AssistantMessage('Assistant 4'),
		];

		const result = reducer(messages);

		// Should keep only the last 3 HumanMessages
		const humanMessages = result.filter((msg) => msg instanceof HumanMessage);
		expect(humanMessages.length).toBe(3);

		// Should start with HumanMessage
		expect(result[0]).toBeInstanceOf(HumanMessage);
		expect((result[0] as HumanMessage).content).toBe('User 2');

		// Should preserve messages between HumanMessages
		expect(result.length).toBe(6); // User 2, Assistant 2, User 3, Assistant 3, User 4, Assistant 4
	});

	it('should handle typical conversation pattern', () => {
		const reducer = createTrimMessagesReducer(2);
		const messages: BaseMessage[] = [
			new HumanMessage('User 1'),
			new AssistantMessage('Assistant 1'),
			new ToolMessage({ content: 'Tool 1', tool_call_id: '1' }),
			new ToolMessage({ content: 'Tool 2', tool_call_id: '2' }),
			new AssistantMessage('Assistant 2'),
			new HumanMessage('User 2'),
			new AssistantMessage('Assistant 3'),
			new ToolMessage({ content: 'Tool 3', tool_call_id: '3' }),
			new ToolMessage({ content: 'Tool 4', tool_call_id: '4' }),
			new AssistantMessage('Assistant 4'),
			new HumanMessage('User 3'),
			new AssistantMessage('Assistant 5'),
			new ToolMessage({ content: 'Tool 5', tool_call_id: '5' }),
			new ToolMessage({ content: 'Tool 6', tool_call_id: '6' }),
			new AssistantMessage('Assistant 6'),
		];

		const result = reducer(messages);

		// Should keep only the last 2 HumanMessages
		const humanMessages = result.filter((msg) => msg instanceof HumanMessage);
		expect(humanMessages.length).toBe(2);

		// Should start with HumanMessage
		expect(result[0]).toBeInstanceOf(HumanMessage);
		expect((result[0] as HumanMessage).content).toBe('User 2');

		// Should include all messages from User 2 onwards
		expect(result.length).toBe(10);
		expect(result.map((m) => m.content)).toEqual([
			'User 2',
			'Assistant 3',
			'Tool 3',
			'Tool 4',
			'Assistant 4',
			'User 3',
			'Assistant 5',
			'Tool 5',
			'Tool 6',
			'Assistant 6',
		]);
	});

	it('should handle edge case with exactly maxUserMessages', () => {
		const reducer = createTrimMessagesReducer(2);
		const messages: BaseMessage[] = [
			new HumanMessage('User 1'),
			new AssistantMessage('Assistant 1'),
			new HumanMessage('User 2'),
			new AssistantMessage('Assistant 2'),
		];

		const result = reducer(messages);
		expect(result).toEqual(messages);
		expect(result.length).toBe(4);
	});

	it('should handle empty array', () => {
		const reducer = createTrimMessagesReducer(5);
		const messages: BaseMessage[] = [];

		const result = reducer(messages);
		expect(result).toEqual([]);
	});

	it('should handle array with no HumanMessages', () => {
		const reducer = createTrimMessagesReducer(5);
		const messages: BaseMessage[] = [
			new AssistantMessage('Assistant 1'),
			new ToolMessage({ content: 'Tool 1', tool_call_id: '1' }),
			new AssistantMessage('Assistant 2'),
		];

		const result = reducer(messages);
		expect(result).toEqual(messages);
	});

	it('should handle maxUserMessages = 1', () => {
		const reducer = createTrimMessagesReducer(1);
		const messages: BaseMessage[] = [
			new HumanMessage('User 1'),
			new AssistantMessage('Assistant 1'),
			new HumanMessage('User 2'),
			new AssistantMessage('Assistant 2'),
			new HumanMessage('User 3'),
			new AssistantMessage('Assistant 3'),
		];

		const result = reducer(messages);

		// Should keep only the last HumanMessage
		const humanMessages = result.filter((msg) => msg instanceof HumanMessage);
		expect(humanMessages.length).toBe(1);

		// Should start with User 3
		expect(result[0]).toBeInstanceOf(HumanMessage);
		expect((result[0] as HumanMessage).content).toBe('User 3');

		// Should only include User 3 and Assistant 3
		expect(result.length).toBe(2);
	});
});
