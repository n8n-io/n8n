import { HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { END } from '@langchain/langgraph';

import { extractUserRequest, createStandardShouldContinue } from '../subgraph-helpers';

describe('subgraph-helpers', () => {
	describe('extractUserRequest', () => {
		it('should return default value for empty messages', () => {
			const result = extractUserRequest([]);
			expect(result).toBe('');
		});

		it('should return custom default value when provided', () => {
			const result = extractUserRequest([], 'fallback');
			expect(result).toBe('fallback');
		});

		it('should extract content from single HumanMessage', () => {
			const messages = [new HumanMessage('Build a workflow')];
			const result = extractUserRequest(messages);
			expect(result).toBe('Build a workflow');
		});

		it('should return the LAST HumanMessage content', () => {
			const messages: BaseMessage[] = [
				new HumanMessage('First request'),
				new AIMessage('Response 1'),
				new HumanMessage('Second request'),
				new AIMessage('Response 2'),
				new HumanMessage('Latest request'),
			];
			const result = extractUserRequest(messages);
			expect(result).toBe('Latest request');
		});

		it('should ignore non-HumanMessage messages', () => {
			const messages: BaseMessage[] = [
				new AIMessage('System message'),
				new HumanMessage('User message'),
				new ToolMessage({ content: 'Tool result', tool_call_id: '1' }),
			];
			const result = extractUserRequest(messages);
			expect(result).toBe('User message');
		});

		it('should return default when no HumanMessages exist', () => {
			const messages: BaseMessage[] = [
				new AIMessage('Response'),
				new ToolMessage({ content: 'Result', tool_call_id: '1' }),
			];
			const result = extractUserRequest(messages, 'no user input');
			expect(result).toBe('no user input');
		});

		it('should handle HumanMessage with non-string content', () => {
			const message = new HumanMessage('test');
			message.content = [{ type: 'text', text: 'array content' }];
			const messages = [message];
			const result = extractUserRequest(messages, 'fallback');
			// When content is not a string, should return default
			expect(result).toBe('fallback');
		});
	});

	describe('createStandardShouldContinue', () => {
		// Note: Iteration limits are now enforced via LangGraph's recursionLimit at invoke time
		const shouldContinue = createStandardShouldContinue();

		it('should return "tools" when tool calls exist', () => {
			const state = {
				messages: [
					new AIMessage({
						content: '',
						tool_calls: [{ name: 'search_nodes', args: { query: 'gmail' } }],
					}),
				],
			};
			expect(shouldContinue(state)).toBe('tools');
		});

		it('should return END when no tool calls in last message', () => {
			const state = {
				messages: [new AIMessage('Regular response without tools')],
			};
			expect(shouldContinue(state)).toBe(END);
		});

		it('should return END when tool_calls is empty array', () => {
			const state = {
				messages: [new AIMessage({ content: 'Done', tool_calls: [] })],
			};
			expect(shouldContinue(state)).toBe(END);
		});

		it('should return END for empty messages array', () => {
			const state = {
				messages: [] as BaseMessage[],
			};
			expect(shouldContinue(state)).toBe(END);
		});

		it('should check only the last message for tool calls', () => {
			const state = {
				messages: [
					new AIMessage({
						content: '',
						tool_calls: [{ name: 'old_tool', args: {} }],
					}),
					new AIMessage('Final response without tools'),
				],
			};
			expect(shouldContinue(state)).toBe(END);
		});
	});
});
