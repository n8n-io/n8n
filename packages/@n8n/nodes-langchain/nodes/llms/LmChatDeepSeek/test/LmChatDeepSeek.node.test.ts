import { injectReasoningContent } from '../LmChatDeepSeek.node';

describe('injectReasoningContent', () => {
	describe('deepseek-reasoner model', () => {
		it('should inject reasoning_content for assistant message without the field', () => {
			const body = JSON.stringify({
				model: 'deepseek-reasoner',
				messages: [
					{ role: 'user', content: 'Hello' },
					{ role: 'assistant', content: 'Hi there' },
				],
			});

			const result = injectReasoningContent('deepseek-reasoner', body);

			expect(result).toBeDefined();
			const parsed = JSON.parse(result!);
			expect(parsed.messages[1].reasoning_content).toBeNull();
		});

		it('should inject reasoning_content for multiple assistant messages', () => {
			const body = JSON.stringify({
				model: 'deepseek-reasoner',
				messages: [
					{ role: 'user', content: 'Hello' },
					{ role: 'assistant', content: 'Hi' },
					{ role: 'user', content: 'How are you?' },
					{ role: 'assistant', content: 'I am fine' },
				],
			});

			const result = injectReasoningContent('deepseek-reasoner', body);

			expect(result).toBeDefined();
			const parsed = JSON.parse(result!);
			expect(parsed.messages[1].reasoning_content).toBeNull();
			expect(parsed.messages[3].reasoning_content).toBeNull();
		});

		it('should not modify assistant message that already has reasoning_content', () => {
			const body = JSON.stringify({
				model: 'deepseek-reasoner',
				messages: [
					{ role: 'user', content: 'Hello' },
					{ role: 'assistant', content: 'Hi', reasoning_content: 'Some reasoning' },
				],
			});

			const result = injectReasoningContent('deepseek-reasoner', body);

			expect(result).toBeUndefined();
		});

		it('should not modify user messages', () => {
			const body = JSON.stringify({
				model: 'deepseek-reasoner',
				messages: [
					{ role: 'user', content: 'Hello' },
					{ role: 'assistant', content: 'Hi there' },
				],
			});

			const result = injectReasoningContent('deepseek-reasoner', body);

			expect(result).toBeDefined();
			const parsed = JSON.parse(result!);
			expect(parsed.messages[0]).not.toHaveProperty('reasoning_content');
		});

		it('should not modify system messages', () => {
			const body = JSON.stringify({
				model: 'deepseek-reasoner',
				messages: [
					{ role: 'system', content: 'You are helpful' },
					{ role: 'user', content: 'Hello' },
					{ role: 'assistant', content: 'Hi there' },
				],
			});

			const result = injectReasoningContent('deepseek-reasoner', body);

			expect(result).toBeDefined();
			const parsed = JSON.parse(result!);
			expect(parsed.messages[0]).not.toHaveProperty('reasoning_content');
		});

		it('should handle deepseek-reasoner variant model names', () => {
			const body = JSON.stringify({
				model: 'deepseek-reasoner',
				messages: [{ role: 'assistant', content: 'Test' }],
			});

			// Test with different reasoner model names
			const variants = ['deepseek-reasoner', 'deepseek-reasoner-v1', 'deepseek-reasoner-r1'];

			for (const modelName of variants) {
				const result = injectReasoningContent(modelName, body);
				expect(result).toBeDefined();
				const parsed = JSON.parse(result!);
				expect(parsed.messages[0].reasoning_content).toBeNull();
			}
		});
	});

	describe('non-reasoner models', () => {
		it('should return undefined for deepseek-chat model', () => {
			const body = JSON.stringify({
				model: 'deepseek-chat',
				messages: [{ role: 'assistant', content: 'Hi' }],
			});

			const result = injectReasoningContent('deepseek-chat', body);

			expect(result).toBeUndefined();
		});

		it('should return undefined for other model names', () => {
			const body = JSON.stringify({
				model: 'gpt-4',
				messages: [{ role: 'assistant', content: 'Hi' }],
			});

			const result = injectReasoningContent('gpt-4', body);

			expect(result).toBeUndefined();
		});
	});

	describe('edge cases', () => {
		it('should return undefined for invalid JSON', () => {
			const invalidBody = '{ not valid json }';

			const result = injectReasoningContent('deepseek-reasoner', invalidBody);

			expect(result).toBeUndefined();
		});

		it('should return undefined when messages is not an array', () => {
			const body = JSON.stringify({
				model: 'deepseek-reasoner',
				messages: 'not an array',
			});

			const result = injectReasoningContent('deepseek-reasoner', body);

			expect(result).toBeUndefined();
		});

		it('should return undefined when messages field is missing', () => {
			const body = JSON.stringify({
				model: 'deepseek-reasoner',
			});

			const result = injectReasoningContent('deepseek-reasoner', body);

			expect(result).toBeUndefined();
		});

		it('should return undefined when no assistant messages present', () => {
			const body = JSON.stringify({
				model: 'deepseek-reasoner',
				messages: [
					{ role: 'user', content: 'Hello' },
					{ role: 'system', content: 'Be helpful' },
				],
			});

			const result = injectReasoningContent('deepseek-reasoner', body);

			expect(result).toBeUndefined();
		});

		it('should preserve other message fields', () => {
			const body = JSON.stringify({
				model: 'deepseek-reasoner',
				messages: [{ role: 'assistant', content: 'Hi', name: 'test-name', customField: 'value' }],
			});

			const result = injectReasoningContent('deepseek-reasoner', body);

			expect(result).toBeDefined();
			const parsed = JSON.parse(result!);
			expect(parsed.messages[0].name).toBe('test-name');
			expect(parsed.messages[0].customField).toBe('value');
			expect(parsed.messages[0].reasoning_content).toBeNull();
		});

		it('should preserve other body fields', () => {
			const body = JSON.stringify({
				model: 'deepseek-reasoner',
				messages: [{ role: 'assistant', content: 'Hi' }],
				stream: true,
				temperature: 0.7,
			});

			const result = injectReasoningContent('deepseek-reasoner', body);

			expect(result).toBeDefined();
			const parsed = JSON.parse(result!);
			expect(parsed.stream).toBe(true);
			expect(parsed.temperature).toBe(0.7);
		});

		it('should handle empty messages array', () => {
			const body = JSON.stringify({
				model: 'deepseek-reasoner',
				messages: [],
			});

			const result = injectReasoningContent('deepseek-reasoner', body);

			expect(result).toBeUndefined();
		});

		it('should handle assistant message with null content', () => {
			const body = JSON.stringify({
				model: 'deepseek-reasoner',
				messages: [{ role: 'assistant', content: null }],
			});

			const result = injectReasoningContent('deepseek-reasoner', body);

			expect(result).toBeDefined();
			const parsed = JSON.parse(result!);
			expect(parsed.messages[0].reasoning_content).toBeNull();
		});

		it('should handle assistant message with empty content', () => {
			const body = JSON.stringify({
				model: 'deepseek-reasoner',
				messages: [{ role: 'assistant', content: '' }],
			});

			const result = injectReasoningContent('deepseek-reasoner', body);

			expect(result).toBeDefined();
			const parsed = JSON.parse(result!);
			expect(parsed.messages[0].reasoning_content).toBeNull();
		});
	});
});
