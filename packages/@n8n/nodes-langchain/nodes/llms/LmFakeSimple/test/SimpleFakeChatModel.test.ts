import { AIMessageChunk } from '@langchain/core/messages';

import { ResponseManager } from '../ResponseManager';
import { SimpleFakeChatModel } from '../SimpleFakeChatModel';
import type { SimpleFakeResponse } from '../types';

describe('SimpleFakeChatModel', () => {
	let model: SimpleFakeChatModel;
	let responseManager: ResponseManager;

	beforeEach(() => {
		model = new SimpleFakeChatModel();
		responseManager = ResponseManager.getInstance();
		responseManager.reset();
	});

	describe('text responses', () => {
		it('should cycle through text responses', async () => {
			responseManager.setResponses(['Response 1', 'Response 2', 'Response 3']);

			const response1 = await model.invoke('Test message 1');
			const response2 = await model.invoke('Test message 2');
			const response3 = await model.invoke('Test message 3');
			const response4 = await model.invoke('Test message 4'); // Should cycle back to first

			expect(response1.content).toBe('Response 1');
			expect(response2.content).toBe('Response 2');
			expect(response3.content).toBe('Response 3');
			expect(response4.content).toBe('Response 1'); // Cycled back
		});

		it('should return AIMessage instances', async () => {
			responseManager.setResponses(['Test response']);

			const response = await model.invoke('Test message');

			expect(response).toBeInstanceOf(AIMessageChunk);
			expect(response.content).toBe('Test response');
		});
	});

	describe('tool call responses', () => {
		it('should format tool calls correctly', async () => {
			const toolCallResponse: SimpleFakeResponse = {
				content: 'I need to search.',
				toolCalls: [
					{
						name: 'search',
						args: { query: 'test query' },
					},
				],
			};

			responseManager.setResponses([toolCallResponse]);

			const response = await model.invoke('Test message');

			expect(response.content).toBe('I need to search.');
			expect(response.tool_calls).toBeDefined();
			expect(response.tool_calls).toHaveLength(1);
			expect(response.tool_calls![0].name).toBe('search');
			expect(response.tool_calls![0].args).toEqual({ query: 'test query' });
			expect(response.tool_calls![0].type).toBe('function');
			expect((response.tool_calls![0] as any).function.name).toBe('search');
		});

		it('should handle multiple tool calls', async () => {
			const toolCallResponse: SimpleFakeResponse = {
				content: 'Running multiple tools.',
				toolCalls: [
					{
						name: 'search',
						args: { query: 'test' },
					},
					{
						name: 'calculator',
						args: { expression: '2+2' },
					},
				],
			};

			responseManager.setResponses([toolCallResponse]);

			const response = await model.invoke('Test message');

			expect(response.tool_calls).toHaveLength(2);
			expect(response.tool_calls![0].name).toBe('search');
			expect(response.tool_calls![1].name).toBe('calculator');
		});

		it('should generate unique IDs for tool calls without IDs', async () => {
			const toolCallResponse: SimpleFakeResponse = {
				content: 'Testing tool call IDs.',
				toolCalls: [
					{
						name: 'test_tool',
						args: { param: 'value' },
					},
				],
			};

			responseManager.setResponses([toolCallResponse]);

			const response = await model.invoke('Test message');

			expect(response.tool_calls![0].id).toBeDefined();
			expect(response.tool_calls![0].id).toMatch(/^call_\d+_0$/);
		});

		it('should preserve custom tool call IDs', async () => {
			const toolCallResponse: SimpleFakeResponse = {
				content: 'Testing custom IDs.',
				toolCalls: [
					{
						id: 'custom_id_123',
						name: 'test_tool',
						args: { param: 'value' },
					},
				],
			};

			responseManager.setResponses([toolCallResponse]);

			const response = await model.invoke('Test message');

			expect(response.tool_calls![0].id).toBe('custom_id_123');
		});
	});

	describe('mixed responses', () => {
		it('should cycle through mixed text and tool call responses', async () => {
			const toolCallResponse: SimpleFakeResponse = {
				content: 'Using a tool.',
				toolCalls: [
					{
						name: 'test_tool',
						args: { param: 'value' },
					},
				],
			};

			responseManager.setResponses(['Text response', toolCallResponse, 'Another text']);

			const response1 = await model.invoke('Message 1');
			const response2 = await model.invoke('Message 2');
			const response3 = await model.invoke('Message 3');

			expect(response1.content).toBe('Text response');
			expect(response1.tool_calls?.length || 0).toBe(0);

			expect(response2.content).toBe('Using a tool.');
			expect(response2.tool_calls).toHaveLength(1);

			expect(response3.content).toBe('Another text');
			expect(response3.tool_calls?.length || 0).toBe(0);
		});
	});

	describe('agent compatibility', () => {
		it('should have bindTools method for agent compatibility', () => {
			expect(typeof model.bindTools).toBe('function');
		});

		it('should return itself from bindTools', () => {
			const result = model.bindTools([]);
			expect(result).toBe(model);
		});

		it('should have correct lc_namespace for LangChain compatibility', () => {
			expect(model.lc_namespace).toEqual(['chat_models']);
		});
	});
});
