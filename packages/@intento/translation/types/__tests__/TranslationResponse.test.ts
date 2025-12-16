import type { TranslationResponse } from '../TranslationResponse';

describe('TranslationResponse', () => {
	describe('type structure', () => {
		it('should have all required properties including translation', () => {
			const response: TranslationResponse = {
				text: 'Hello',
				from: 'en',
				to: 'es',
				translation: 'Hola',
			};

			expect(response).toHaveProperty('text');
			expect(response).toHaveProperty('from');
			expect(response).toHaveProperty('to');
			expect(response).toHaveProperty('translation');
		});

		it('should allow optional detectedLanguage and latency properties', () => {
			const response: TranslationResponse = {
				text: 'Hello',
				from: 'en',
				to: 'es',
				translation: 'Hola',
				detectedLanguage: 'en',
				latency: 150,
			};

			expect(response.detectedLanguage).toBe('en');
			expect(response.latency).toBe(150);
		});

		it('should work without optional properties', () => {
			const response: TranslationResponse = {
				text: 'Hello',
				from: 'en',
				to: 'es',
				translation: 'Hola',
			};

			expect(response.detectedLanguage).toBeUndefined();
			expect(response.latency).toBeUndefined();
		});
	});

	describe('translation property', () => {
		it('should accept various translations with special characters', () => {
			const testCases: TranslationResponse[] = [
				{ text: 'Hello', from: 'en', to: 'es', translation: 'Hola' },
				{ text: 'Hello', from: 'en', to: 'zh', translation: '你好' },
				{ text: 'Hello', from: 'en', to: 'ar', translation: 'مرحبا' },
				{ text: 'Hello', from: 'en', to: 'ru', translation: 'Привет' },
				{ text: 'Hello', from: 'en', to: 'es', translation: 'Hello, World!' },
				{ text: 'Hello', from: 'en', to: 'es', translation: 'Line 1\nLine 2' },
				{ text: 'Hello', from: 'en', to: 'es', translation: 'Emoji: 😀🌍🚀' },
			];

			testCases.forEach((response) => {
				expect(typeof response.translation).toBe('string');
			});
		});
	});

	describe('optional detectedLanguage property', () => {
		it('should accept language codes and be undefined when not provided', () => {
			const withLanguage: TranslationResponse = {
				text: 'Hello',
				from: 'en',
				to: 'es',
				translation: 'Hola',
				detectedLanguage: 'en',
			};

			const withoutLanguage: TranslationResponse = {
				text: 'Hello',
				from: 'en',
				to: 'es',
				translation: 'Hola',
			};

			expect(withLanguage.detectedLanguage).toBe('en');
			expect(withoutLanguage.detectedLanguage).toBeUndefined();
		});
	});

	describe('optional latency property', () => {
		it('should accept numeric latency values including zero', () => {
			const testCases: TranslationResponse[] = [
				{ text: 'Hello', from: 'en', to: 'es', translation: 'Hola', latency: 0 },
				{ text: 'Hello', from: 'en', to: 'es', translation: 'Hola', latency: 100 },
				{ text: 'Hello', from: 'en', to: 'es', translation: 'Hola', latency: 1000 },
				{ text: 'Hello', from: 'en', to: 'es', translation: 'Hola', latency: 60000 },
			];

			testCases.forEach((response) => {
				expect(typeof response.latency).toBe('number');
			});
		});

		it('should be undefined when not provided', () => {
			const response: TranslationResponse = {
				text: 'Hello',
				from: 'en',
				to: 'es',
				translation: 'Hola',
			};

			expect(response.latency).toBeUndefined();
		});
	});

	describe('object structure', () => {
		it('should be serializable and deserializable to/from JSON', () => {
			const response: TranslationResponse = {
				text: 'Hello',
				from: 'en',
				to: 'es',
				translation: 'Hola',
				detectedLanguage: 'en',
				latency: 150,
			};

			const json = JSON.stringify(response);
			const parsed = JSON.parse(json) as TranslationResponse;

			expect(parsed.text).toBe('Hello');
			expect(parsed.from).toBe('en');
			expect(parsed.to).toBe('es');
			expect(parsed.translation).toBe('Hola');
			expect(parsed.detectedLanguage).toBe('en');
			expect(parsed.latency).toBe(150);
		});
	});
});
