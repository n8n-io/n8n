import { AIMessageChunk } from '@langchain/core/messages';
import { ResponseManager } from '../ResponseManager';

describe('ResponseManager', () => {
	let responseManager: ResponseManager;
	let testResponses: AIMessageChunk[];

	beforeEach(() => {
		testResponses = [
			new AIMessageChunk({ content: 'Response 1' }),
			new AIMessageChunk({ content: 'Response 2' }),
			new AIMessageChunk({ content: 'Response 3' }),
		];
		responseManager = new ResponseManager(testResponses);
	});

	describe('getNextResponse', () => {
		it('should return responses in reverse sequence (LIFO)', () => {
			const response1 = responseManager.getNextResponse();
			const response2 = responseManager.getNextResponse();
			const response3 = responseManager.getNextResponse();

			// Since responses are reversed in constructor, should get them in reverse order
			expect(response1.content).toBe('Response 3');
			expect(response2.content).toBe('Response 2');
			expect(response3.content).toBe('Response 1');
		});

		it('should handle empty responses gracefully', () => {
			const emptyManager = new ResponseManager([]);
			const response = emptyManager.getNextResponse();

			expect(response.content).toBe('No responses configured');
		});

		it('should return fallback message when no more responses available', () => {
			// Use all responses
			responseManager.getNextResponse();
			responseManager.getNextResponse();
			responseManager.getNextResponse();

			// Should return fallback message
			const response = responseManager.getNextResponse();
			expect(response.content).toBe('No more responses available');
		});
	});
});
