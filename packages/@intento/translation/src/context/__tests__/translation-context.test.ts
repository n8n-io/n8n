import 'reflect-metadata';

import { TranslationContext } from '../translation-context';

/**
 * Tests for TranslationContext
 * @author Claude Sonnet 4.5
 * @date 2026-01-13
 */

describe('TranslationContext', () => {
	beforeEach(() => {
		// Mock @mapTo decorator metadata
		jest.spyOn(Reflect, 'getMetadata').mockImplementation((key, _target, propertyKey) => {
			if (key === 'design:paramtypes') return [Object, String, String];
			if (key === 'custom:mapTo' && propertyKey === undefined) {
				return ['translation_context_text', 'translation_context_to', 'translation_context_from'];
			}
			return undefined;
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('business logic', () => {
		it('[BL-01] should construct with text array, to language, and from language', () => {
			// ARRANGE & ACT
			const context = new TranslationContext(['Hello', 'World'], 'en', 'de');

			// ASSERT
			expect(context.text).toEqual(['Hello', 'World']);
			expect(context.to).toBe('en');
			expect(context.from).toBe('de');
			expect(context.from).toBeDefined();
		});

		it('[BL-02] should construct with only text and to (auto-detect from)', () => {
			// ARRANGE & ACT
			const context = new TranslationContext(['Hello'], 'en');

			// ASSERT
			expect(context.text).toEqual(['Hello']);
			expect(context.to).toBe('en');
			expect(context.from).toBeUndefined();
		});

		it('[BL-02b] should construct with explicit undefined from parameter', () => {
			// ARRANGE & ACT
			const context = new TranslationContext(['Text'], 'en', undefined);

			// ASSERT
			expect(context.text).toEqual(['Text']);
			expect(context.to).toBe('en');
			expect(context.from).toBeUndefined();
		});

		it('[BL-03] should normalize single string to array', () => {
			// ARRANGE & ACT
			const context = new TranslationContext('Hello, world!' as unknown as string[], 'en');

			// ASSERT
			expect(context.text).toEqual(['Hello, world!']);
			expect(Array.isArray(context.text)).toBe(true);
		});

		it('[BL-04] should preserve array when text is already array', () => {
			// ARRANGE
			const textArray = ['First', 'Second', 'Third'];

			// ACT
			const context = new TranslationContext(textArray, 'en');

			// ASSERT
			expect(context.text).toEqual(textArray);
			expect(context.text).toHaveLength(3);
		});

		it('[BL-05] should be immutable after construction', () => {
			// ARRANGE
			const context = new TranslationContext(['text'], 'en', 'de');

			// ACT & ASSERT
			expect(Object.isFrozen(context)).toBe(true);
			expect(() => {
				(context as unknown as { to: string }).to = 'fr';
			}).toThrow();
		});

		it('[BL-06] should return correct log metadata with all fields', () => {
			// ARRANGE
			const context = new TranslationContext(['Hello', 'World'], 'en', 'de');

			// ACT
			const metadata = context.asLogMetadata();

			// ASSERT
			expect(metadata).toEqual({
				from: 'de',
				to: 'en',
				textCount: 2,
			});
		});

		it('[BL-07] should return log metadata without from when undefined', () => {
			// ARRANGE
			const context = new TranslationContext(['Hello'], 'en');

			// ACT
			const metadata = context.asLogMetadata();

			// ASSERT
			expect(metadata).toEqual({
				from: undefined,
				to: 'en',
				textCount: 1,
			});
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should handle single-item array', () => {
			// ARRANGE & ACT
			const context = new TranslationContext(['Single'], 'en');

			// ASSERT
			expect(context.text).toEqual(['Single']);
			expect(context.text).toHaveLength(1);
		});

		it('[EC-02] should handle multi-item array (3+ items)', () => {
			// ARRANGE
			const texts = ['First', 'Second', 'Third', 'Fourth'];

			// ACT
			const context = new TranslationContext(texts, 'en');

			// ASSERT
			expect(context.text).toEqual(texts);
			expect(context.text).toHaveLength(4);
		});

		it('[EC-03] should handle to language with whitespace (trim validation)', () => {
			// ARRANGE & ACT
			const context = new TranslationContext(['text'], '  en  ');

			// ASSERT - whitespace preserved in storage, validation checks trim
			expect(context.to).toBe('  en  ');
			expect(() => context.throwIfInvalid()).not.toThrow();
		});

		it('[EC-04] should include textCount in metadata, not actual text', () => {
			// ARRANGE
			const sensitiveText = ['Secret document 1', 'Secret document 2'];
			const context = new TranslationContext(sensitiveText, 'en');

			// ACT
			const metadata = context.asLogMetadata();

			// ASSERT - PII protection
			expect(metadata.textCount).toBe(2);
			expect(metadata).not.toHaveProperty('text');
			expect(JSON.stringify(metadata)).not.toContain('Secret');
		});

		it('[EC-05] should handle ISO 639-1 language codes (e.g., "en")', () => {
			// ARRANGE & ACT
			const context = new TranslationContext(['text'], 'en', 'de');

			// ASSERT
			expect(context.to).toBe('en');
			expect(context.from).toBe('de');
		});

		it('[EC-06] should handle BCP-47 language codes (e.g., "en-US")', () => {
			// ARRANGE & ACT
			const context = new TranslationContext(['text'], 'en-US', 'de-DE');

			// ASSERT
			expect(context.to).toBe('en-US');
			expect(context.from).toBe('de-DE');
		});
	});

	describe('error handling', () => {
		it('[EH-01] should throw Error if text contains null values', () => {
			// ARRANGE
			const context = new TranslationContext([null as unknown as string, 'valid'], 'en');

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('"text" contains null or undefined values.');
		});

		it('[EH-02] should throw Error if text contains undefined values', () => {
			// ARRANGE
			const context = new TranslationContext(['valid', undefined as unknown as string], 'en');

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('"text" contains null or undefined values.');
		});

		it('[EH-03] should throw Error if text contains both null and undefined', () => {
			// ARRANGE
			const context = new TranslationContext([null as unknown as string, 'valid', undefined as unknown as string], 'en');

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('"text" contains null or undefined values.');
		});

		it('[EH-04] should throw Error if to language is undefined', () => {
			// ARRANGE
			const context = new TranslationContext(['text'], undefined as unknown as string);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('"to" language must be specified.');
		});

		it('[EH-05] should throw Error if to language is empty string', () => {
			// ARRANGE
			const context = new TranslationContext(['text'], '');

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('"to" language must be specified.');
		});

		it('[EH-06] should throw Error if to language is whitespace-only', () => {
			// ARRANGE
			const context = new TranslationContext(['text'], '   ');

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('"to" language must be specified.');
		});

		it('[EH-07] should throw Error if text array is empty', () => {
			// ARRANGE
			const context = new TranslationContext([], 'en');

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('"text" must contain at least one string to translate.');
		});

		it('[EH-08] should pass validation with valid text, to, and from', () => {
			// ARRANGE
			const context = new TranslationContext(['Hello', 'World'], 'en', 'de');

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).not.toThrow();
		});

		it('[EH-09] should pass validation with valid text and to (no from)', () => {
			// ARRANGE
			const context = new TranslationContext(['Hello'], 'en');

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).not.toThrow();
		});

		it('[EH-10] should throw Error if text filter finds null in mixed array', () => {
			// ARRANGE
			const context = new TranslationContext(['valid1', null as unknown as string, 'valid2', null as unknown as string], 'en');

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('"text" contains null or undefined values.');
			// Verify filter found multiple null values
			const wrongText = context.text.filter((t) => t === null || t === undefined);
			expect(wrongText).toHaveLength(2);
		});
	});

	describe('metadata & data', () => {
		it('[MD-01] should log textCount for single text item', () => {
			// ARRANGE
			const context = new TranslationContext(['Single item'], 'en');

			// ACT
			const metadata = context.asLogMetadata();

			// ASSERT
			expect(metadata.textCount).toBe(1);
		});

		it('[MD-02] should log textCount for multiple text items', () => {
			// ARRANGE
			const context = new TranslationContext(['Item 1', 'Item 2', 'Item 3', 'Item 4'], 'en');

			// ACT
			const metadata = context.asLogMetadata();

			// ASSERT
			expect(metadata.textCount).toBe(4);
		});

		it('[MD-03] should not log actual text content (PII protection)', () => {
			// ARRANGE
			const sensitiveTexts = ['Patient name: John Doe', 'SSN: 123-45-6789', 'Diagnosis: Confidential'];
			const context = new TranslationContext(sensitiveTexts, 'en');

			// ACT
			const metadata = context.asLogMetadata();
			const serialized = JSON.stringify(metadata);

			// ASSERT - verify PII not in logs
			expect(metadata).not.toHaveProperty('text');
			expect(serialized).not.toContain('John Doe');
			expect(serialized).not.toContain('SSN');
			expect(serialized).not.toContain('Diagnosis');
			expect(serialized).not.toContain('Patient');
			expect(metadata.textCount).toBe(3);
		});
	});
});
