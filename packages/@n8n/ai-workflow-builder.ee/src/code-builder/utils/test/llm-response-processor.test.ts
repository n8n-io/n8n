/**
 * Tests for LLM Response Processor
 */

import { AIMessage } from '@langchain/core/messages';

import { processLlmResponse } from '../llm-response-processor';

describe('processLlmResponse', () => {
	it('should extract token usage from response metadata', () => {
		const response = new AIMessage({
			content: 'Hello',
			response_metadata: {
				usage: {
					input_tokens: 100,
					output_tokens: 50,
				},
			},
		});

		const result = processLlmResponse(response);

		expect(result.inputTokens).toBe(100);
		expect(result.outputTokens).toBe(50);
	});

	it('should default to 0 tokens when metadata is missing', () => {
		const response = new AIMessage({
			content: 'Hello',
		});

		const result = processLlmResponse(response);

		expect(result.inputTokens).toBe(0);
		expect(result.outputTokens).toBe(0);
	});

	it('should extract text content from string response', () => {
		const response = new AIMessage({
			content: 'Hello world',
		});

		const result = processLlmResponse(response);

		expect(result.textContent).toBe('Hello world');
	});

	it('should extract text content from array response', () => {
		const response = new AIMessage({
			content: [{ type: 'text', text: 'Hello from array' }],
		});

		const result = processLlmResponse(response);

		expect(result.textContent).toBe('Hello from array');
	});

	it('should return null text content for empty response', () => {
		const response = new AIMessage({
			content: '',
		});

		const result = processLlmResponse(response);

		expect(result.textContent).toBeNull();
	});

	it('should extract thinking content when present', () => {
		const response = new AIMessage({
			content: [
				{ type: 'thinking', thinking: 'My thought process' },
				{ type: 'text', text: 'Final answer' },
			],
		});

		const result = processLlmResponse(response);

		expect(result.thinkingContent).toBe('My thought process');
		expect(result.textContent).toBe('Final answer');
	});

	it('should return null thinking content when not present', () => {
		const response = new AIMessage({
			content: 'Just text',
		});

		const result = processLlmResponse(response);

		expect(result.thinkingContent).toBeNull();
	});

	it('should detect when there are tool calls', () => {
		const response = new AIMessage({
			content: '',
			tool_calls: [
				{
					id: '1',
					name: 'search_nodes',
					args: { query: 'test' },
				},
			],
		});

		const result = processLlmResponse(response);

		expect(result.hasToolCalls).toBe(true);
		expect(result.toolCalls).toHaveLength(1);
		expect(result.toolCalls[0].name).toBe('search_nodes');
	});

	it('should return empty tool calls when none present', () => {
		const response = new AIMessage({
			content: 'No tools',
		});

		const result = processLlmResponse(response);

		expect(result.hasToolCalls).toBe(false);
		expect(result.toolCalls).toHaveLength(0);
	});
});
