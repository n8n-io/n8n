import type { TranslationResponse } from '../TranslationResponse';

describe('TranslationResponse', () => {
	describe('required properties', () => {
		it('should have required properties: text, from, to, translation', () => {
			const response: TranslationResponse = {
				text: 'Hello',
				from: 'en',
				to: 'es',
				translation: 'Hola',
			};

			expect(response.text).toBe('Hello');
			expect(response.from).toBe('en');
			expect(response.to).toBe('es');
			expect(response.translation).toBe('Hola');
		});
	});

	describe('optional properties', () => {
		it('should support optional detectedLanguage and latency properties', () => {
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

	describe('latency property', () => {
		it('should accept zero and positive numeric latency values', () => {
			const testCases = [0, 100, 1000, 60000];

			testCases.forEach((latency) => {
				const response: TranslationResponse = {
					text: 'Hello',
					from: 'en',
					to: 'es',
					translation: 'Hola',
					latency,
				};

				expect(response.latency).toBe(latency);
			});
		});

		it('should handle edge case latency values', () => {
			const edgeCases = [
				0, // minimum
				1, // minimal value
				Number.MAX_SAFE_INTEGER, // maximum safe integer
				1000000, // very large value
				9999999, // near-boundary large value
			];

			edgeCases.forEach((latency) => {
				const response: TranslationResponse = {
					text: 'Hello',
					from: 'en',
					to: 'es',
					translation: 'Hola',
					latency,
				};

				expect(response.latency).toBe(latency);
				expect(typeof response.latency).toBe('number');
			});
		});
	});

	describe('translation content variations', () => {
		it('should handle empty translation strings', () => {
			const response: TranslationResponse = {
				text: 'Hello',
				from: 'en',
				to: 'es',
				translation: '',
			};

			expect(response.translation).toBe('');
			expect(response.translation.length).toBe(0);
		});

		it('should handle very long translation strings', () => {
			const longTranslation = 'a'.repeat(10000);
			const response: TranslationResponse = {
				text: 'Hello',
				from: 'en',
				to: 'es',
				translation: longTranslation,
			};

			expect(response.translation).toBe(longTranslation);
			expect(response.translation.length).toBe(10000);
		});

		it('should handle special characters and unicode in translations', () => {
			const testCases = [
				{ text: 'Hello', translation: '你好' }, // Chinese
				{ text: 'Hello', translation: 'مرحبا' }, // Arabic
				{ text: 'Hello', translation: '🎉🌟✨' }, // Emojis
				{ text: 'Hello', translation: '<script>alert("xss")</script>' }, // HTML/script-like content
				{ text: 'Hello', translation: 'Line1\nLine2\nLine3' }, // Newlines
			];

			testCases.forEach(({ text, translation }) => {
				const response: TranslationResponse = {
					text,
					from: 'en',
					to: 'es',
					translation,
				};

				expect(response.translation).toBe(translation);
			});
		});
	});

	describe('text and language code variations', () => {
		it('should handle empty text input', () => {
			const response: TranslationResponse = {
				text: '',
				from: 'en',
				to: 'es',
				translation: '',
			};

			expect(response.text).toBe('');
		});

		it('should handle very long text input', () => {
			const longText = 'word '.repeat(1000);
			const response: TranslationResponse = {
				text: longText,
				from: 'en',
				to: 'es',
				translation: 'translated',
			};

			expect(response.text).toBe(longText);
			expect(response.text.length).toBeGreaterThan(4000);
		});

		it('should support various language code formats', () => {
			const testCases = [
				{ from: 'en', to: 'es' },
				{ from: 'en-US', to: 'es-MX' },
				{ from: 'zh', to: 'zh-Hans' },
				{ from: 'pt', to: 'pt-BR' },
			];

			testCases.forEach(({ from, to }) => {
				const response: TranslationResponse = {
					text: 'Hello',
					from,
					to,
					translation: 'Hola',
				};

				expect(response.from).toBe(from);
				expect(response.to).toBe(to);
			});
		});
	});
});
