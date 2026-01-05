import 'reflect-metadata';

import { TranslationRequest } from '../../supply/translation-request';
import { TranslationContext, CONTEXT_TRANSLATION } from '../translation-context';

/**
 * Tests for TranslationContext
 * @author Claude Sonnet 4.5
 * @date 2025-01-05
 */

describe('TranslationContext', () => {
	describe('business logic', () => {
		it('[BL-01] should create context with all parameters', () => {
			// ARRANGE & ACT
			const context = new TranslationContext('Hello, world!', 'es', 'en');

			// ASSERT
			expect(context.text).toBe('Hello, world!');
			expect(context.to).toBe('es');
			expect(context.from).toBe('en');
		});

		it('[BL-02] should create context without from language (auto-detect)', () => {
			// ARRANGE & ACT
			const context = new TranslationContext('Bonjour', 'en');

			// ASSERT
			expect(context.text).toBe('Bonjour');
			expect(context.to).toBe('en');
			expect(context.from).toBeUndefined();
		});

		it('[BL-03] should freeze instance after construction', () => {
			// ARRANGE & ACT
			const context = new TranslationContext('Test', 'fr');

			// ASSERT
			expect(Object.isFrozen(context)).toBe(true);

			// Verify property modification fails
			expect(() => {
				(context as { to: string }).to = 'de';
			}).toThrow();
		});

		it('[BL-04] should validate successfully with target language', () => {
			// ARRANGE
			const context = new TranslationContext('Text', 'ja');

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).not.toThrow();
		});

		it('[BL-05] should return correct log metadata with from language', () => {
			// ARRANGE
			const context = new TranslationContext('Hello', 'es', 'en');

			// ACT
			const metadata = context.asLogMetadata();

			// ASSERT
			expect(metadata).toEqual({
				from: 'en',
				to: 'es',
			});
		});

		it('[BL-06] should return correct log metadata without from language', () => {
			// ARRANGE
			const context = new TranslationContext('Hello', 'fr');

			// ACT
			const metadata = context.asLogMetadata();

			// ASSERT
			expect(metadata).toEqual({
				from: undefined,
				to: 'fr',
			});
		});

		it('[BL-07] should convert to TranslationRequest with all parameters', () => {
			// ARRANGE
			const context = new TranslationContext('Test text', 'de', 'en');

			// ACT
			const request = context.toRequest();

			// ASSERT
			expect(request).toBeInstanceOf(TranslationRequest);
			expect(request.text).toBe('Test text');
			expect(request.to).toBe('de');
			expect(request.from).toBe('en');
		});

		it('[BL-08] should convert to TranslationRequest without from language', () => {
			// ARRANGE
			const context = new TranslationContext('Texto de prueba', 'en');

			// ACT
			const request = context.toRequest();

			// ASSERT
			expect(request).toBeInstanceOf(TranslationRequest);
			expect(request.text).toBe('Texto de prueba');
			expect(request.to).toBe('en');
			expect(request.from).toBeUndefined();
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should handle whitespace-only target language', () => {
			// ARRANGE
			const context = new TranslationContext('Text', '   ');

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('"to" language must be specified.');
		});

		it('[EC-02] should handle target language with surrounding whitespace', () => {
			// ARRANGE
			const context = new TranslationContext('Text', '  es  ');

			// ACT & ASSERT
			// Note: Code doesn't trim before using, only for validation
			expect(() => context.throwIfInvalid()).not.toThrow();
			expect(context.to).toBe('  es  ');
		});

		it('[EC-03] should handle empty from language', () => {
			// ARRANGE
			const context = new TranslationContext('Hello', 'en', '');

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).not.toThrow();
			expect(context.from).toBe('');
		});

		it('[EC-04] should handle empty text', () => {
			// ARRANGE
			const context = new TranslationContext('', 'en');

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).not.toThrow();
			expect(context.text).toBe('');
		});
	});

	describe('error handling', () => {
		it('[EH-01] should throw when target language is undefined', () => {
			// ARRANGE
			const context = new TranslationContext('Text', undefined as unknown as string);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('"to" language must be specified.');
		});

		it('[EH-02] should throw when target language is empty string', () => {
			// ARRANGE
			const context = new TranslationContext('Text', '');

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('"to" language must be specified.');
		});

		it('[EH-03] should throw when target language is only whitespace', () => {
			// ARRANGE
			const context = new TranslationContext('Text', '\t\n  ');

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('"to" language must be specified.');
		});
	});

	describe('CONTEXT_TRANSLATION node properties', () => {
		it('[NP-01] should export from language property with correct configuration', () => {
			// ARRANGE
			const fromProperty = CONTEXT_TRANSLATION[0];

			// ASSERT
			expect(fromProperty).toBeDefined();
			expect(fromProperty.displayName).toBe('From Language');
			expect(fromProperty.name).toBe('translation_context_from');
			expect(fromProperty.type).toBe('string');
			expect(fromProperty.default).toBe('');
			expect(fromProperty.placeholder).toBe('auto (detect)');
		});

		it('[NP-02] should export to language property with correct configuration', () => {
			// ARRANGE
			const toProperty = CONTEXT_TRANSLATION[1];

			// ASSERT
			expect(toProperty).toBeDefined();
			expect(toProperty.displayName).toBe('To Language');
			expect(toProperty.name).toBe('translation_context_to');
			expect(toProperty.type).toBe('string');
			expect(toProperty.default).toBe('en');
			expect(toProperty.placeholder).toBe('en');
		});

		it('[NP-03] should have to language marked as required', () => {
			// ARRANGE
			const toProperty = CONTEXT_TRANSLATION[1] as { required: boolean };

			// ASSERT
			expect(toProperty.required).toBe(true);
		});

		it('[NP-04] should export text property with correct configuration', () => {
			// ARRANGE
			const textProperty = CONTEXT_TRANSLATION[2];

			// ASSERT
			expect(textProperty).toBeDefined();
			expect(textProperty.displayName).toBe('Text');
			expect(textProperty.name).toBe('translation_context_text');
			expect(textProperty.type).toBe('string');
			expect(textProperty.default).toBe('');
			expect(textProperty.placeholder).toBe('Hello, world!');
		});

		it('[NP-05] should export exactly three properties', () => {
			// ASSERT
			expect(CONTEXT_TRANSLATION).toHaveLength(3);
		});
	});
});
