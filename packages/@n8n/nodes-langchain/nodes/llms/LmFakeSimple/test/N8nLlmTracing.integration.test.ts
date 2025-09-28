import { mock } from 'jest-mock-extended';
import type { ISupplyDataFunctions } from 'n8n-workflow';

import { N8nLlmTracing } from '../../N8nLlmTracing';
import { ResponseManager } from '../ResponseManager';
import { SimpleFakeChatModel } from '../SimpleFakeChatModel';

describe('N8nLlmTracing Integration', () => {
	let model: SimpleFakeChatModel;
	let responseManager: ResponseManager;
	let mockTracingCallback: jest.Mocked<N8nLlmTracing>;
	let mockSupplyDataFunctions: jest.Mocked<ISupplyDataFunctions>;

	beforeEach(() => {
		responseManager = ResponseManager.getInstance();
		responseManager.reset();

		// Mock the ISupplyDataFunctions
		mockSupplyDataFunctions = mock<ISupplyDataFunctions>();

		// Create a mock N8nLlmTracing instance
		mockTracingCallback = mock<N8nLlmTracing>();
		mockTracingCallback.handleLLMStart = jest.fn().mockResolvedValue(undefined);
		mockTracingCallback.handleLLMEnd = jest.fn().mockResolvedValue(undefined);

		model = new SimpleFakeChatModel([mockTracingCallback]);
	});

	describe('tracing callbacks', () => {
		it('should call handleLLMStart with correct parameters', async () => {
			responseManager.setResponses(['Test response']);

			await model.invoke('Test message');

			expect(mockTracingCallback.handleLLMStart).toHaveBeenCalledTimes(1);

			const [llmSerialized, promptStrings, runId] =
				mockTracingCallback.handleLLMStart.mock.calls[0];

			// Check that we pass the correct format
			expect(llmSerialized).toEqual({ type: 'constructor', kwargs: {}, lc: 0, id: [''] });
			expect(promptStrings).toEqual(['Test message']);
			expect(typeof runId).toBe('string');
		});

		it('should call handleLLMEnd with correct response format', async () => {
			responseManager.setResponses(['Test response']);

			await model.invoke('Test message');

			expect(mockTracingCallback.handleLLMEnd).toHaveBeenCalledTimes(1);

			const [output, runId] = mockTracingCallback.handleLLMEnd.mock.calls[0];

			// Check that we pass the correct LLMResult format
			expect(output.generations).toEqual([[{ text: 'Test response', generationInfo: {} }]]);
			expect(output.llmOutput).toEqual({});
			expect(typeof runId).toBe('string');
		});

		it('should use same runId for start and end callbacks', async () => {
			responseManager.setResponses(['Test response']);

			await model.invoke('Test message');

			const startRunId = mockTracingCallback.handleLLMStart.mock.calls[0][2];
			const endRunId = mockTracingCallback.handleLLMEnd.mock.calls[0][1];

			expect(startRunId).toBe(endRunId);
		});

		it('should handle complex messages correctly', async () => {
			responseManager.setResponses(['Complex response']);

			// Test with an array of messages (as agents might pass)
			await model.invoke([
				{ content: 'Message 1' },
				{ content: 'Message 2' },
				'String message',
			] as any);

			expect(mockTracingCallback.handleLLMStart).toHaveBeenCalledTimes(1);

			const [, promptStrings] = mockTracingCallback.handleLLMStart.mock.calls[0];

			// Should convert complex messages to string array
			expect(promptStrings).toEqual(['Message 1', 'Message 2', 'String message']);
		});

		it('should handle tool call responses in tracing', async () => {
			responseManager.setResponses([
				{
					content: 'I need to search.',
					toolCalls: [{ name: 'search', args: { query: 'test' } }],
				},
			]);

			await model.invoke('Search for something');

			expect(mockTracingCallback.handleLLMEnd).toHaveBeenCalledTimes(1);

			const [output] = mockTracingCallback.handleLLMEnd.mock.calls[0];

			// Should trace the text content (tool calls are handled separately by LangChain)
			expect(output.generations[0][0].text).toBe('I need to search.');
		});

		it('should handle errors gracefully in callbacks', async () => {
			// Mock handleLLMStart to throw an error
			mockTracingCallback.handleLLMStart.mockRejectedValue(new Error('Tracing error'));

			responseManager.setResponses(['Test response']);

			// Should not throw error - should continue execution
			const result = await model.invoke('Test message');

			expect(result.content).toBe('Test response');
			expect(mockTracingCallback.handleLLMStart).toHaveBeenCalledTimes(1);
			// handleLLMEnd should still be called even if start failed
			expect(mockTracingCallback.handleLLMEnd).toHaveBeenCalledTimes(1);
		});
	});
});
