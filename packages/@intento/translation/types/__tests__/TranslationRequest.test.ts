import type { TranslationRequest } from '../TranslationRequest';

describe('TranslationRequest', () => {
	describe('type structure', () => {
		it('should have required properties: text, from, to', () => {
			const request: TranslationRequest = {
				text: 'Hello',
				from: 'en',
				to: 'es',
			};

			expect(request).toHaveProperty('text');
			expect(request).toHaveProperty('from');
			expect(request).toHaveProperty('to');
		});

		it('should accept text with special characters and various languages', () => {
			const testCases: TranslationRequest[] = [
				{ text: 'Hello, World!', from: 'en', to: 'es' },
				{ text: 'Line 1\nLine 2', from: 'en', to: 'es' },
				{ text: 'Unicode: 你好, مرحبا, שלום', from: 'zh', to: 'ar' },
				{ text: 'Emoji: 😀🌍🚀', from: 'en', to: 'ja' },
				{ text: '  Hello  World  ', from: 'en', to: 'es' },
			];

			testCases.forEach((request) => {
				expect(typeof request.text).toBe('string');
				expect(typeof request.from).toBe('string');
				expect(typeof request.to).toBe('string');
			});
		});
	});

	describe('language code validation scenarios', () => {
		it('should work with common language pairs', () => {
			const commonPairs: Array<[string, string]> = [
				['en', 'es'],
				['fr', 'de'],
				['zh', 'ja'],
				['es', 'pt'],
				['it', 'fr'],
			];

			commonPairs.forEach(([from, to]) => {
				const request: TranslationRequest = {
					text: 'Sample text',
					from,
					to,
				};

				expect(request.from).toBe(from);
				expect(request.to).toBe(to);
			});
		});
	});

	describe('object structure', () => {
		it('should be serializable and deserializable to/from JSON', () => {
			const request: TranslationRequest = {
				text: 'Hello',
				from: 'en',
				to: 'es',
			};

			const json = JSON.stringify(request);
			const parsed = JSON.parse(json) as TranslationRequest;

			expect(parsed.text).toBe('Hello');
			expect(parsed.from).toBe('en');
			expect(parsed.to).toBe('es');
		});
	});
});
