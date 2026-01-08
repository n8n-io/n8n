import { MODELS_ALLOWING_NON_RESPONSES_API_PATTERN } from '../constants';

describe('MODELS_ALLOWING_NON_RESPONSES_API_PATTERN', () => {
	describe('should match chat/completions compatible models', () => {
		const chatCompletionsModels = [
			'gpt-5',
			'gpt-5.1',
			'gpt-4.1',
			'gpt-4.1-mini',
			'gpt-4.1-nano',
			'gpt-4o',
			'gpt-4o-mini',
			'gpt-4-turbo',
			'gpt-4-turbo-preview',
			'gpt-4',
			'gpt-4-preview',
			'gpt-4-vision-preview',
			'gpt-3.5-turbo',
			'gpt-3.5-turbo-0301',
			'gpt-3.5-turbo-latest',
			'gpt-3.5-turbo-16k',
			'gpt-3.5-turbo-instruct',
			'gpt-3.5-turbo-instruct-0914',
			'text-davinci-003',
			'text-davinci-002',
			'davinci-002',
			'babbage-002',
		];

		it.each(chatCompletionsModels)('should match "%s"', (model) => {
			expect(MODELS_ALLOWING_NON_RESPONSES_API_PATTERN.test(model)).toBe(true);
		});
	});

	describe('should NOT match models that require Responses API', () => {
		const responsesApiModels = [
			'dall-e-2',
			'dall-e-3',
			'text-embedding-ada-002',
			'text-embedding-3-small',
			'text-embedding-3-large',
			'whisper-1',
			'tts-1',
			'tts-1-hd',
			'tts-1-1106',
			'tts-1-hd-1106',
			'gpt-5-pro',
			'codex-something-max',
			'computer-use-preview',
			'o1-preview',
			'o1-mini',
			'o3-mini',
		];

		it.each(responsesApiModels)('should NOT match "%s"', (model) => {
			expect(MODELS_ALLOWING_NON_RESPONSES_API_PATTERN.test(model)).toBe(false);
		});
	});

	describe('should correctly handle edge cases', () => {
		it('should NOT match empty string', () => {
			expect(MODELS_ALLOWING_NON_RESPONSES_API_PATTERN.test('')).toBe(false);
		});

		it('should NOT match partial model names', () => {
			expect(MODELS_ALLOWING_NON_RESPONSES_API_PATTERN.test('gpt-4-turbo-extra')).toBe(false);
			expect(MODELS_ALLOWING_NON_RESPONSES_API_PATTERN.test('prefix-gpt-4')).toBe(false);
		});

		it('should NOT match models with invalid suffixes', () => {
			expect(MODELS_ALLOWING_NON_RESPONSES_API_PATTERN.test('gpt-4-12345')).toBe(false);
			expect(MODELS_ALLOWING_NON_RESPONSES_API_PATTERN.test('gpt-4-abc')).toBe(false);
		});
	});
});
