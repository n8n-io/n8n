import { mock } from 'jest-mock-extended';

import type { TranslationRequest } from '../translation-request';
import { TranslationResponse } from '../translation-response';

/**
 * Tests for TranslationResponse
 * @author Claude Sonnet 4.5
 * @date 2025-01-05
 */

describe('TranslationResponse', () => {
	const MOCK_REQUEST_ID = 'translation-req-uuid-001';
	const MOCK_REQUEST_TIMESTAMP = 1704412800000; // 2025-01-05 00:00:00 UTC
	const MOCK_RESPONSE_TIMESTAMP_250 = 1704412800250; // +250ms latency
	const MOCK_RESPONSE_TIMESTAMP_0 = 1704412800000; // Same millisecond (0ms latency)

	let mockDateNow: jest.SpyInstance;

	beforeEach(() => {
		mockDateNow = jest.spyOn(Date, 'now');
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('business logic', () => {
		it('[BL-01] should copy from, to, text from request', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_REQUEST_TIMESTAMP,
				text: 'Hello, world!',
				to: 'es',
				from: 'en',
			});
			mockDateNow.mockReturnValue(MOCK_RESPONSE_TIMESTAMP_250);

			// ACT
			const response = new TranslationResponse(request, 'Hola, mundo!');

			// ASSERT
			expect(response.from).toBe('en');
			expect(response.to).toBe('es');
			expect(response.text).toBe('Hello, world!');
		});

		it('[BL-02] should store translation result', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_REQUEST_TIMESTAMP,
				text: 'Hello',
				to: 'fr',
				from: 'en',
			});
			mockDateNow.mockReturnValue(MOCK_RESPONSE_TIMESTAMP_250);

			// ACT
			const response = new TranslationResponse(request, 'Bonjour');

			// ASSERT
			expect(response.translation).toBe('Bonjour');
		});

		it('[BL-03] should store detectedLanguage when provided', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_REQUEST_TIMESTAMP,
				text: 'Hola',
				to: 'en',
				from: undefined,
			});
			mockDateNow.mockReturnValue(MOCK_RESPONSE_TIMESTAMP_250);

			// ACT
			const response = new TranslationResponse(request, 'Hello', 'es');

			// ASSERT
			expect(response.detectedLanguage).toBe('es');
		});

		it('[BL-04] should call parent constructor with request', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_REQUEST_TIMESTAMP,
				text: 'Test',
				to: 'de',
				from: 'en',
			});
			mockDateNow.mockReturnValue(MOCK_RESPONSE_TIMESTAMP_250);

			// ACT
			const response = new TranslationResponse(request, 'Test translation');

			// ASSERT
			// Verify inherited properties from SupplyResponseBase
			expect(response.requestId).toBe(MOCK_REQUEST_ID);
			expect(response.latencyMs).toBe(250);
		});

		it('[BL-05] should return log metadata without text/translation', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_REQUEST_TIMESTAMP,
				text: 'Secret content',
				to: 'ja',
				from: 'en',
			});
			mockDateNow.mockReturnValue(MOCK_RESPONSE_TIMESTAMP_250);

			// ACT
			const response = new TranslationResponse(request, 'Sensitive translation', 'en');
			const metadata = response.asLogMetadata();

			// ASSERT
			expect(metadata).toEqual({
				requestId: MOCK_REQUEST_ID,
				from: 'en',
				to: 'ja',
				detectedLanguage: 'en',
				latencyMs: 250,
			});
			expect(metadata).not.toHaveProperty('text');
			expect(metadata).not.toHaveProperty('translation');
		});

		it('[BL-06] should return data object with all fields', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_REQUEST_TIMESTAMP,
				text: 'Original text',
				to: 'zh',
				from: 'en',
			});
			mockDateNow.mockReturnValue(MOCK_RESPONSE_TIMESTAMP_250);

			// ACT
			const response = new TranslationResponse(request, 'Translated text', 'en');
			const dataObject = response.asDataObject();

			// ASSERT
			expect(dataObject).toEqual({
				from: 'en',
				to: 'zh',
				text: 'Original text',
				translation: 'Translated text',
				detectedLanguage: 'en',
				latencyMs: 250,
			});
		});

		it('[BL-07] should correlate response to request via requestId', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_REQUEST_TIMESTAMP,
				text: 'Test',
				to: 'pt',
				from: 'en',
			});
			mockDateNow.mockReturnValue(MOCK_RESPONSE_TIMESTAMP_250);

			// ACT
			const response = new TranslationResponse(request, 'Teste');

			// ASSERT
			expect(response.requestId).toBe(request.requestId);
			expect(response.asLogMetadata().requestId).toBe(request.requestId);
		});

		it('[BL-08] should calculate latency from request timestamp', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_REQUEST_TIMESTAMP,
				text: 'Test',
				to: 'ru',
				from: 'en',
			});
			mockDateNow.mockReturnValue(MOCK_RESPONSE_TIMESTAMP_250);

			// ACT
			const response = new TranslationResponse(request, 'Тест');

			// ASSERT
			expect(response.latencyMs).toBe(250);
			expect(response.latencyMs).toBe(MOCK_RESPONSE_TIMESTAMP_250 - MOCK_REQUEST_TIMESTAMP);
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should handle undefined from language', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_REQUEST_TIMESTAMP,
				text: 'Bonjour',
				to: 'en',
				from: undefined,
			});
			mockDateNow.mockReturnValue(MOCK_RESPONSE_TIMESTAMP_250);

			// ACT
			const response = new TranslationResponse(request, 'Hello', 'fr');

			// ASSERT
			expect(response.from).toBeUndefined();
			expect(response.to).toBe('en');
			expect(response.detectedLanguage).toBe('fr');
		});

		it('[EC-02] should handle undefined detectedLanguage', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_REQUEST_TIMESTAMP,
				text: 'Hello',
				to: 'es',
				from: 'en',
			});
			mockDateNow.mockReturnValue(MOCK_RESPONSE_TIMESTAMP_250);

			// ACT
			const response = new TranslationResponse(request, 'Hola');

			// ASSERT
			expect(response.detectedLanguage).toBeUndefined();
		});

		it('[EC-03] should handle both from and detectedLanguage defined', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_REQUEST_TIMESTAMP,
				text: 'Test',
				to: 'fr',
				from: 'en',
			});
			mockDateNow.mockReturnValue(MOCK_RESPONSE_TIMESTAMP_250);

			// ACT - This scenario could occur if supplier overrides the detected language
			const response = new TranslationResponse(request, 'Test', 'en-US');

			// ASSERT
			expect(response.from).toBe('en');
			expect(response.detectedLanguage).toBe('en-US');
		});

		it('[EC-04] should preserve empty string in text', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_REQUEST_TIMESTAMP,
				text: '',
				to: 'de',
				from: 'en',
			});
			mockDateNow.mockReturnValue(MOCK_RESPONSE_TIMESTAMP_250);

			// ACT
			const response = new TranslationResponse(request, '');

			// ASSERT
			expect(response.text).toBe('');
			expect(response.text.length).toBe(0);
		});

		it('[EC-05] should preserve empty string in translation', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_REQUEST_TIMESTAMP,
				text: 'Test',
				to: 'it',
				from: 'en',
			});
			mockDateNow.mockReturnValue(MOCK_RESPONSE_TIMESTAMP_250);

			// ACT
			const response = new TranslationResponse(request, '');

			// ASSERT
			expect(response.translation).toBe('');
			expect(response.translation.length).toBe(0);
		});

		it('[EC-06] should handle special characters in text/translation', () => {
			// ARRANGE
			const specialText = '🌍 Hello! "Quotes" & <tags> 日本語';
			const specialTranslation = '🌏 こんにちは！ "引用" & <タグ>';
			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_REQUEST_TIMESTAMP,
				text: specialText,
				to: 'ja',
				from: 'en',
			});
			mockDateNow.mockReturnValue(MOCK_RESPONSE_TIMESTAMP_250);

			// ACT
			const response = new TranslationResponse(request, specialTranslation);

			// ASSERT
			expect(response.text).toBe(specialText);
			expect(response.translation).toBe(specialTranslation);
			expect(response.asDataObject().text).toBe(specialText);
			expect(response.asDataObject().translation).toBe(specialTranslation);
		});

		it('[EC-07] should handle zero latency (immediate response)', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_REQUEST_TIMESTAMP,
				text: 'Test',
				to: 'ko',
				from: 'en',
			});
			mockDateNow.mockReturnValue(MOCK_RESPONSE_TIMESTAMP_0);

			// ACT
			const response = new TranslationResponse(request, '테스트');

			// ASSERT
			expect(response.latencyMs).toBe(0);
		});
	});

	describe('error handling', () => {
		it('[EH-01] should include detectedLanguage in metadata when present', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_REQUEST_TIMESTAMP,
				text: 'Test',
				to: 'en',
				from: undefined,
			});
			mockDateNow.mockReturnValue(MOCK_RESPONSE_TIMESTAMP_250);

			// ACT
			const response = new TranslationResponse(request, 'Test', 'de');
			const metadata = response.asLogMetadata();

			// ASSERT
			expect(metadata.detectedLanguage).toBe('de');
		});

		it('[EH-02] should exclude detectedLanguage from metadata when undefined', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_REQUEST_TIMESTAMP,
				text: 'Test',
				to: 'ar',
				from: 'en',
			});
			mockDateNow.mockReturnValue(MOCK_RESPONSE_TIMESTAMP_250);

			// ACT
			const response = new TranslationResponse(request, 'اختبار');
			const metadata = response.asLogMetadata();

			// ASSERT
			expect(metadata.detectedLanguage).toBeUndefined();
			expect(metadata).toHaveProperty('detectedLanguage');
		});

		it('[EH-03] should include detectedLanguage in data object when present', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_REQUEST_TIMESTAMP,
				text: 'Test',
				to: 'en',
				from: undefined,
			});
			mockDateNow.mockReturnValue(MOCK_RESPONSE_TIMESTAMP_250);

			// ACT
			const response = new TranslationResponse(request, 'Test', 'sv');
			const dataObject = response.asDataObject();

			// ASSERT
			expect(dataObject.detectedLanguage).toBe('sv');
		});
	});
});
