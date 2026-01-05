import 'reflect-metadata';

import { TranslationRequest } from '../translation-request';

/**
 * Tests for TranslationRequest
 * @author Claude Sonnet 4.5
 * @date 2025-01-05
 */

describe('TranslationRequest', () => {
	describe('business logic', () => {
		it('[BL-01] should create request with all parameters', () => {
			// ARRANGE & ACT
			const request = new TranslationRequest('Hello, world!', 'es', 'en');

			// ASSERT
			expect(request.text).toBe('Hello, world!');
			expect(request.to).toBe('es');
			expect(request.from).toBe('en');
		});

		it('[BL-02] should create request without from language', () => {
			// ARRANGE & ACT
			const request = new TranslationRequest('Bonjour', 'en');

			// ASSERT
			expect(request.text).toBe('Bonjour');
			expect(request.to).toBe('en');
			expect(request.from).toBeUndefined();
		});

		it('[BL-03] should inherit requestId from base class', () => {
			// ARRANGE & ACT
			const request = new TranslationRequest('Test', 'fr');

			// ASSERT
			expect(request.requestId).toBeDefined();
			expect(typeof request.requestId).toBe('string');
			expect(request.requestId.length).toBeGreaterThan(0);
		});

		it('[BL-04] should inherit requestedAt from base class', () => {
			// ARRANGE & ACT
			const request = new TranslationRequest('Test', 'de');

			// ASSERT
			expect(request.requestedAt).toBeDefined();
			expect(typeof request.requestedAt).toBe('number');
			expect(request.requestedAt).toBeLessThanOrEqual(Date.now());
		});

		it('[BL-05] should freeze instance after construction', () => {
			// ARRANGE & ACT
			const request = new TranslationRequest('Test', 'ja');

			// ASSERT
			expect(Object.isFrozen(request)).toBe(true);

			// Verify property modification fails
			expect(() => {
				(request as { to: string }).to = 'zh';
			}).toThrow();
		});

		it('[BL-06] should validate successfully with valid target language', () => {
			// ARRANGE & ACT
			const request = new TranslationRequest('Text', 'it');

			// ASSERT - Construction succeeded, validation passed
			expect(request.to).toBe('it');
		});

		it('[BL-07] should return correct log metadata', () => {
			// ARRANGE
			const request = new TranslationRequest('Hello', 'es', 'en');

			// ACT
			const metadata = request.asLogMetadata();

			// ASSERT
			expect(metadata).toHaveProperty('requestId', request.requestId);
			expect(metadata).toHaveProperty('from', 'en');
			expect(metadata).toHaveProperty('to', 'es');
			expect(metadata).toHaveProperty('requestedAt', request.requestedAt);
			expect(metadata).not.toHaveProperty('text'); // Text excluded from logs
		});

		it('[BL-08] should return log metadata without from language', () => {
			// ARRANGE
			const request = new TranslationRequest('Text', 'fr');

			// ACT
			const metadata = request.asLogMetadata();

			// ASSERT
			expect(metadata).toHaveProperty('from', undefined);
			expect(metadata).toHaveProperty('to', 'fr');
			expect(metadata).toHaveProperty('requestId');
		});

		it('[BL-09] should return execution data with all fields', () => {
			// ARRANGE
			const request = new TranslationRequest('Test text', 'de', 'en');

			// ACT
			const executionData = request.asExecutionData();

			// ASSERT
			expect(executionData).toHaveLength(1);
			expect(executionData[0]).toHaveLength(1);
			expect(executionData[0][0].json).toEqual({
				requestId: request.requestId,
				from: 'en',
				to: 'de',
				text: 'Test text',
				requestedAt: request.requestedAt,
			});
		});

		it('[BL-10] should return execution data without from language', () => {
			// ARRANGE
			const request = new TranslationRequest('Sample', 'it');

			// ACT
			const executionData = request.asExecutionData();

			// ASSERT
			expect(executionData[0][0].json).toHaveProperty('from', undefined);
			expect(executionData[0][0].json).toHaveProperty('to', 'it');
			expect(executionData[0][0].json).toHaveProperty('text', 'Sample');
		});

		it('[BL-11] should clone request with all parameters', () => {
			// ARRANGE
			const original = new TranslationRequest('Original text', 'ru', 'en');

			// ACT
			const cloned = original.clone();

			// ASSERT
			expect(cloned).toBeInstanceOf(TranslationRequest);
			expect(cloned.text).toBe('Original text');
			expect(cloned.to).toBe('ru');
			expect(cloned.from).toBe('en');
			expect(cloned.requestId).not.toBe(original.requestId); // Clone gets new ID
			expect(cloned.requestId).toBeDefined();
		});

		it('[BL-12] should clone request without from language', () => {
			// ARRANGE
			const original = new TranslationRequest('Test', 'pt');

			// ACT
			const cloned = original.clone();

			// ASSERT
			expect(cloned.text).toBe('Test');
			expect(cloned.to).toBe('pt');
			expect(cloned.from).toBeUndefined();
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should handle empty text', () => {
			// ARRANGE & ACT
			const request = new TranslationRequest('', 'en');

			// ASSERT
			expect(request.text).toBe('');
			expect(request.asExecutionData()[0][0].json.text).toBe('');
		});

		it('[EC-02] should handle target language with surrounding whitespace', () => {
			// ARRANGE & ACT
			const request = new TranslationRequest('Text', '  es  ');

			// ASSERT
			// Note: Code doesn't trim before using, only for validation
			expect(request.to).toBe('  es  ');
		});

		it('[EC-03] should handle empty from language', () => {
			// ARRANGE & ACT
			const request = new TranslationRequest('Hello', 'en', '');

			// ASSERT
			expect(request.from).toBe('');
		});

		it('[EC-04] should create independent clone', () => {
			// ARRANGE
			const original = new TranslationRequest('Test', 'fr');

			// ACT
			const cloned = original.clone();

			// ASSERT
			expect(cloned).not.toBe(original); // Different instances
			expect(Object.isFrozen(cloned)).toBe(true); // Clone is also frozen
			expect(cloned.requestId).not.toBe(original.requestId); // New ID for clone
			expect(cloned.requestId).toBeDefined();
		});
	});

	describe('error handling', () => {
		it('[EH-01] should throw when target language is undefined', () => {
			// ACT & ASSERT
			expect(() => {
				new TranslationRequest('Text', undefined as unknown as string);
			}).toThrow('targetLanguage is required');
		});

		it('[EH-02] should throw when target language is null', () => {
			// ACT & ASSERT
			expect(() => {
				new TranslationRequest('Text', null as unknown as string);
			}).toThrow('targetLanguage is required');
		});

		it('[EH-03] should throw when target language is empty string', () => {
			// ACT & ASSERT
			expect(() => {
				new TranslationRequest('Text', '');
			}).toThrow('targetLanguage is required');
		});

		it('[EH-04] should throw when target language is only whitespace', () => {
			// ACT & ASSERT
			expect(() => {
				new TranslationRequest('Text', '   \t\n   ');
			}).toThrow('targetLanguage is required');
		});

		it('[EH-05] should throw immediately on construction with invalid target', () => {
			// ARRANGE
			let errorThrown = false;

			// ACT
			try {
				new TranslationRequest('Will fail', '  ');
			} catch (error) {
				errorThrown = true;
			}

			// ASSERT
			expect(errorThrown).toBe(true);
		});
	});
});
