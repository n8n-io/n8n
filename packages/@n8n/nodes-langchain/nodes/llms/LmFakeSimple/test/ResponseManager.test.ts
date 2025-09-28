import { ResponseManager } from '../ResponseManager';
import type { SimpleFakeResponse } from '../types';

describe('ResponseManager', () => {
	let manager: ResponseManager;

	beforeEach(() => {
		manager = ResponseManager.getInstance();
		manager.reset();
	});

	describe('singleton pattern', () => {
		it('should return the same instance', () => {
			const instance1 = ResponseManager.getInstance();
			const instance2 = ResponseManager.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe('cycling through responses', () => {
		it('should cycle through text responses', () => {
			manager.setResponses(['Response 1', 'Response 2', 'Response 3']);

			expect(manager.getNextResponse()).toBe('Response 1');
			expect(manager.getNextResponse()).toBe('Response 2');
			expect(manager.getNextResponse()).toBe('Response 3');
			expect(manager.getNextResponse()).toBe('Response 1'); // Should cycle back
		});

		it('should handle single response', () => {
			manager.setResponses(['Single response']);

			expect(manager.getNextResponse()).toBe('Single response');
			expect(manager.getNextResponse()).toBe('Single response');
			expect(manager.getNextResponse()).toBe('Single response');
		});

		it('should handle mixed response types', () => {
			const toolResponse: SimpleFakeResponse = {
				content: 'Tool response',
				toolCalls: [{ name: 'test', args: {} }],
			};

			manager.setResponses(['Text response', toolResponse]);

			expect(manager.getNextResponse()).toBe('Text response');
			expect(manager.getNextResponse()).toEqual(toolResponse);
			expect(manager.getNextResponse()).toBe('Text response'); // Cycle back
		});
	});

	describe('response management', () => {
		it('should reset index when reset is called', () => {
			manager.setResponses(['Response 1', 'Response 2', 'Response 3']);

			// Advance to second response
			manager.getNextResponse();
			manager.getNextResponse();

			// Reset should go back to first
			manager.reset();
			expect(manager.getNextResponse()).toBe('Response 1');
		});

		it('should reset index when new responses are set', () => {
			manager.setResponses(['Old 1', 'Old 2']);
			manager.getNextResponse(); // Advance to first
			manager.getNextResponse(); // Advance to second

			manager.setResponses(['New 1', 'New 2']);
			expect(manager.getNextResponse()).toBe('New 1'); // Should start from beginning
		});

		it('should use default response when empty array is provided', () => {
			manager.setResponses([]);
			expect(manager.getNextResponse()).toBe('Default fake response');
		});

		it('should return copy of responses from getResponses', () => {
			const originalResponses = ['Response 1', 'Response 2'];
			manager.setResponses(originalResponses);

			const retrievedResponses = manager.getResponses();
			retrievedResponses.push('Modified');

			// Original responses should not be modified
			expect(manager.getResponses()).toEqual(['Response 1', 'Response 2']);
		});
	});

	describe('state persistence', () => {
		it('should maintain state across multiple getInstance calls', () => {
			manager.setResponses(['Persistent 1', 'Persistent 2']);
			manager.getNextResponse(); // Advance to first

			const manager2 = ResponseManager.getInstance();
			expect(manager2.getNextResponse()).toBe('Persistent 2'); // Should continue from where left off
		});
	});
});
