import 'reflect-metadata';

import { TranslationRequest } from '../translation-request';
import { TranslationResponse } from '../translation-response';

/**
 * Tests for TranslationResponse
 * @author Claude Sonnet 4.5
 * @date 2025-01-05
 */

describe('TranslationResponse', () => {
	describe('business logic', () => {
		it('[BL-01] should create response with all request parameters and translation', () => {
			// ARRANGE
			const request = new TranslationRequest('Hello, world!', 'es', 'en');

			// ACT
			const response = new TranslationResponse(request, 'Hola, mundo!');

			// ASSERT
			expect(response.text).toBe('Hello, world!');
			expect(response.to).toBe('es');
			expect(response.from).toBe('en');
			expect(response.translation).toBe('Hola, mundo!');
			expect(response.detectedLanguage).toBeUndefined();
		});

		it('[BL-02] should create response without from language (auto-detect scenario)', () => {
			// ARRANGE
			const request = new TranslationRequest('Bonjour', 'en');

			// ACT
			const response = new TranslationResponse(request, 'Hello');

			// ASSERT
			expect(response.text).toBe('Bonjour');
			expect(response.to).toBe('en');
			expect(response.from).toBeUndefined();
			expect(response.translation).toBe('Hello');
		});

		it('[BL-03] should create response with detected language', () => {
			// ARRANGE
			const request = new TranslationRequest('Ciao', 'en');

			// ACT
			const response = new TranslationResponse(request, 'Hello', 'it');

			// ASSERT
			expect(response.from).toBeUndefined(); // Original request had no from
			expect(response.detectedLanguage).toBe('it');
			expect(response.translation).toBe('Hello');
		});

		it('[BL-04] should not set detected language when from is specified', () => {
			// ARRANGE
			const request = new TranslationRequest('Hello', 'fr', 'en');

			// ACT
			const response = new TranslationResponse(request, 'Bonjour');

			// ASSERT
			expect(response.from).toBe('en');
			expect(response.detectedLanguage).toBeUndefined();
		});

		it('[BL-05] should inherit requestId from base class', () => {
			// ARRANGE
			const request = new TranslationRequest('Test', 'de');

			// ACT
			const response = new TranslationResponse(request, 'Test');

			// ASSERT
			expect(response.requestId).toBeDefined();
			expect(typeof response.requestId).toBe('string');
			expect(response.requestId).toBe(request.requestId);
		});

		it('[BL-06] should inherit latencyMs from base class', () => {
			// ARRANGE
			const request = new TranslationRequest('Test', 'ja');

			// ACT
			const response = new TranslationResponse(request, 'テスト');

			// ASSERT
			expect(response.latencyMs).toBeDefined();
			expect(typeof response.latencyMs).toBe('number');
			expect(response.latencyMs).toBeGreaterThanOrEqual(0);
		});

		it('[BL-07] should return correct log metadata with all fields', () => {
			// ARRANGE
			const request = new TranslationRequest('Hello', 'es', 'en');
			const response = new TranslationResponse(request, 'Hola', 'en');

			// ACT
			const metadata = response.asLogMetadata();

			// ASSERT
			expect(metadata).toHaveProperty('requestId', response.requestId);
			expect(metadata).toHaveProperty('from', 'en');
			expect(metadata).toHaveProperty('to', 'es');
			expect(metadata).toHaveProperty('detectedLanguage', 'en');
			expect(metadata).toHaveProperty('latencyMs');
			expect(metadata).not.toHaveProperty('text'); // Text excluded from logs
			expect(metadata).not.toHaveProperty('translation'); // Translation excluded from logs
		});

		it('[BL-08] should return log metadata without from language', () => {
			// ARRANGE
			const request = new TranslationRequest('Text', 'fr');
			const response = new TranslationResponse(request, 'Texte');

			// ACT
			const metadata = response.asLogMetadata();

			// ASSERT
			expect(metadata).toHaveProperty('from', undefined);
			expect(metadata).toHaveProperty('to', 'fr');
		});

		it('[BL-09] should return log metadata with detected language', () => {
			// ARRANGE
			const request = new TranslationRequest('Text', 'ru');
			const response = new TranslationResponse(request, 'Текст', 'en');

			// ACT
			const metadata = response.asLogMetadata();

			// ASSERT
			expect(metadata).toHaveProperty('detectedLanguage', 'en');
		});

		it('[BL-10] should return execution data with all fields', () => {
			// ARRANGE
			const request = new TranslationRequest('Test text', 'de', 'en');
			const response = new TranslationResponse(request, 'Testtext', 'en');

			// ACT
			const executionData = response.asExecutionData();

			// ASSERT
			expect(executionData).toHaveLength(1);
			expect(executionData[0]).toHaveLength(1);
			expect(executionData[0][0].json).toEqual({
				requestId: response.requestId,
				from: 'en',
				to: 'de',
				text: 'Test text',
				translation: 'Testtext',
				detectedLanguage: 'en',
				latencyMs: response.latencyMs,
			});
		});

		it('[BL-11] should return execution data without from language', () => {
			// ARRANGE
			const request = new TranslationRequest('Sample', 'it');
			const response = new TranslationResponse(request, 'Campione');

			// ACT
			const executionData = response.asExecutionData();

			// ASSERT
			expect(executionData[0][0].json).toHaveProperty('from', undefined);
			expect(executionData[0][0].json).toHaveProperty('to', 'it');
			expect(executionData[0][0].json).toHaveProperty('text', 'Sample');
			expect(executionData[0][0].json).toHaveProperty('translation', 'Campione');
		});

		it('[BL-12] should return execution data with detected language', () => {
			// ARRANGE
			const request = new TranslationRequest('Hola', 'en');
			const response = new TranslationResponse(request, 'Hello', 'es');

			// ACT
			const executionData = response.asExecutionData();

			// ASSERT
			expect(executionData[0][0].json).toHaveProperty('detectedLanguage', 'es');
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should handle empty original text', () => {
			// ARRANGE
			const request = new TranslationRequest('', 'en');

			// ACT
			const response = new TranslationResponse(request, '');

			// ASSERT
			expect(response.text).toBe('');
			expect(response.asExecutionData()[0][0].json.text).toBe('');
		});

		it('[EC-02] should handle empty translation', () => {
			// ARRANGE
			const request = new TranslationRequest('Test', 'en');

			// ACT
			const response = new TranslationResponse(request, '');

			// ASSERT
			expect(response.translation).toBe('');
			expect(response.asExecutionData()[0][0].json.translation).toBe('');
		});

		it('[EC-03] should handle empty detected language', () => {
			// ARRANGE
			const request = new TranslationRequest('Text', 'en');

			// ACT
			const response = new TranslationResponse(request, 'Text', '');

			// ASSERT
			expect(response.detectedLanguage).toBe('');
			expect(response.asLogMetadata().detectedLanguage).toBe('');
		});

		it('[EC-04] should preserve multi-line text in translation', () => {
			// ARRANGE
			const multiLineText = 'Line 1\nLine 2\nLine 3';
			const multiLineTranslation = 'Línea 1\nLínea 2\nLínea 3';
			const request = new TranslationRequest(multiLineText, 'es', 'en');

			// ACT
			const response = new TranslationResponse(request, multiLineTranslation);

			// ASSERT
			expect(response.text).toBe(multiLineText);
			expect(response.translation).toBe(multiLineTranslation);
			expect(response.asExecutionData()[0][0].json.text).toBe(multiLineText);
			expect(response.asExecutionData()[0][0].json.translation).toBe(multiLineTranslation);
		});
	});

	describe('error handling', () => {
		it('[EH-01] should preserve all request context in response', () => {
			// ARRANGE
			const request = new TranslationRequest('Original text', 'pt', 'en');

			// ACT
			const response = new TranslationResponse(request, 'Texto original');

			// ASSERT
			expect(response.text).toBe(request.text);
			expect(response.to).toBe(request.to);
			expect(response.from).toBe(request.from);
			expect(response.requestId).toBe(request.requestId);
		});

		it('[EH-02] should include translation in execution data but not log metadata', () => {
			// ARRANGE
			const request = new TranslationRequest('Sensitive data', 'fr', 'en');
			const response = new TranslationResponse(request, 'Données sensibles');

			// ACT
			const logMetadata = response.asLogMetadata();
			const executionData = response.asExecutionData();

			// ASSERT
			// Log metadata should not include text/translation
			expect(logMetadata).not.toHaveProperty('text');
			expect(logMetadata).not.toHaveProperty('translation');

			// Execution data should include everything
			expect(executionData[0][0].json).toHaveProperty('text', 'Sensitive data');
			expect(executionData[0][0].json).toHaveProperty('translation', 'Données sensibles');
		});
	});
});
