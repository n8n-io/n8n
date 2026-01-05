import { mock } from 'jest-mock-extended';
import type { INode } from 'n8n-workflow';

import { TranslationError } from '../translation-error';
import type { TranslationRequest } from '../translation-request';

/**
 * Tests for TranslationError
 * @author Claude Sonnet 4.5
 * @date 2025-01-05
 */

describe('TranslationError', () => {
	const MOCK_REQUEST_ID = 'translation-req-uuid-001';
	const MOCK_REQUEST_TIMESTAMP = 1704412800000; // 2025-01-05 00:00:00 UTC
	const MOCK_ERROR_TIMESTAMP_250 = 1704412800250; // +250ms latency
	const MOCK_ERROR_TIMESTAMP_0 = 1704412800000; // Same millisecond (0ms latency)

	// HTTP Status Codes
	const CODE_BAD_REQUEST = 400;
	const CODE_RATE_LIMIT = 429;
	const CODE_SERVER_ERROR = 500;

	let mockDateNow: jest.SpyInstance;
	let mockNode: INode;

	beforeEach(() => {
		mockDateNow = jest.spyOn(Date, 'now');
		mockNode = mock<INode>();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('business logic', () => {
		it('[BL-01] should copy from, to, text from request', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				text: 'Hello, world!',
				to: 'es',
				from: 'en',
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_REQUEST_TIMESTAMP,
			});
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_250);

			// ACT
			const error = new TranslationError(request, CODE_SERVER_ERROR, 'Translation failed');

			// ASSERT
			expect(error.from).toBe('en');
			expect(error.to).toBe('es');
			expect(error.text).toBe('Hello, world!');
		});

		it('[BL-02] should call parent constructor with request, code, reason', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				text: 'Test text',
				to: 'fr',
				from: 'en',
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_REQUEST_TIMESTAMP,
			});
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_250);

			// ACT
			const error = new TranslationError(request, CODE_BAD_REQUEST, 'Invalid language code');

			// ASSERT
			// Verify inherited properties from SupplyErrorBase
			expect(error.requestId).toBe(MOCK_REQUEST_ID);
			expect(error.code).toBe(CODE_BAD_REQUEST);
			expect(error.reason).toBe('Invalid language code');
			expect(error.latencyMs).toBe(250);
		});

		it('[BL-03] should freeze instance after construction', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				text: 'Test',
				to: 'de',
				from: 'en',
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_REQUEST_TIMESTAMP,
			});
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_250);

			// ACT
			const error = new TranslationError(request, CODE_SERVER_ERROR, 'Server error');

			// ASSERT
			expect(Object.isFrozen(error)).toBe(true);

			// Verify property modification fails
			expect(() => {
				(error as { to: string }).to = 'fr';
			}).toThrow();
		});

		it('[BL-04] should return log metadata without text field', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				text: 'Hello, world!',
				to: 'ja',
				from: 'en',
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_REQUEST_TIMESTAMP,
			});
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_250);

			// ACT
			const error = new TranslationError(request, CODE_RATE_LIMIT, 'Rate limit exceeded');
			const metadata = error.asLogMetadata();

			// ASSERT
			expect(metadata).toEqual({
				requestId: MOCK_REQUEST_ID,
				from: 'en',
				to: 'ja',
				errorCode: CODE_RATE_LIMIT,
				errorReason: 'Rate limit exceeded',
				latencyMs: 250,
			});
			expect(metadata).not.toHaveProperty('text');
		});

		it('[BL-05] should return data object with text field', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				text: 'Test content',
				to: 'zh',
				from: 'en',
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_REQUEST_TIMESTAMP,
			});
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_250);

			// ACT
			const error = new TranslationError(request, CODE_SERVER_ERROR, 'Internal server error');
			const dataObject = error.asDataObject();

			// ASSERT
			expect(dataObject).toEqual({
				from: 'en',
				to: 'zh',
				text: 'Test content',
				errorCode: CODE_SERVER_ERROR,
				errorReason: 'Internal server error',
				latencyMs: 250,
			});
		});

		it('[BL-06] should create NodeOperationError with formatted message', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				text: 'Test',
				to: 'pt',
				from: 'en',
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_REQUEST_TIMESTAMP,
			});
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_250);

			// ACT
			const error = new TranslationError(request, CODE_BAD_REQUEST, 'Invalid target language');
			const nodeError = error.asError(mockNode);

			// ASSERT
			expect(nodeError.message).toBe('🌍 Translation has been failed: [400] Invalid target language');
			expect(nodeError.node).toBe(mockNode);
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should handle undefined from language', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				text: 'Bonjour',
				to: 'en',
				from: undefined,
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_REQUEST_TIMESTAMP,
			});
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_250);

			// ACT
			const error = new TranslationError(request, CODE_SERVER_ERROR, 'Translation service down');

			// ASSERT
			expect(error.from).toBeUndefined();
			expect(error.to).toBe('en');
			expect(error.text).toBe('Bonjour');
		});

		it('[EC-02] should preserve empty string in text', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				text: '',
				to: 'es',
				from: 'en',
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_REQUEST_TIMESTAMP,
			});
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_250);

			// ACT
			const error = new TranslationError(request, CODE_BAD_REQUEST, 'Empty text not allowed');

			// ASSERT
			expect(error.text).toBe('');
			expect(error.text.length).toBe(0);
		});

		it('[EC-03] should handle zero latency (same timestamp)', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				text: 'Test',
				to: 'fr',
				from: 'en',
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_REQUEST_TIMESTAMP,
			});
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_0);

			// ACT
			const error = new TranslationError(request, CODE_SERVER_ERROR, 'Immediate failure');

			// ASSERT
			expect(error.latencyMs).toBe(0);
		});

		it('[EC-04] should handle special characters in text', () => {
			// ARRANGE
			const specialText = '🌍 Hello! "Quotes" & <tags> 日本語';
			const request = mock<TranslationRequest>({
				text: specialText,
				to: 'en',
				from: 'ja',
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_REQUEST_TIMESTAMP,
			});
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_250);

			// ACT
			const error = new TranslationError(request, CODE_SERVER_ERROR, 'Failed to process');

			// ASSERT
			expect(error.text).toBe(specialText);
			expect(error.asDataObject().text).toBe(specialText);
		});
	});

	describe('error handling', () => {
		it('[EH-01] should include error code in message', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				text: 'Test',
				to: 'de',
				from: 'en',
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_REQUEST_TIMESTAMP,
			});
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_250);

			// ACT
			const error = new TranslationError(request, CODE_RATE_LIMIT, 'Too many requests');
			const nodeError = error.asError(mockNode);

			// ASSERT
			expect(nodeError.message).toContain('[429]');
			expect(nodeError.message).toContain('429');
		});

		it('[EH-02] should include error reason in message', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				text: 'Test',
				to: 'it',
				from: 'en',
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_REQUEST_TIMESTAMP,
			});
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_250);
			const reason = 'Unsupported language pair';

			// ACT
			const error = new TranslationError(request, CODE_BAD_REQUEST, reason);
			const nodeError = error.asError(mockNode);

			// ASSERT
			expect(nodeError.message).toContain(reason);
		});

		it('[EH-03] should pass node context to NodeOperationError', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				text: 'Test',
				to: 'ru',
				from: 'en',
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_REQUEST_TIMESTAMP,
			});
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_250);
			const specificNode = mock<INode>({ name: 'TranslationNode' });

			// ACT
			const error = new TranslationError(request, CODE_SERVER_ERROR, 'Service unavailable');
			const nodeError = error.asError(specificNode);

			// ASSERT
			expect(nodeError.node).toBe(specificNode);
			expect(nodeError.node).not.toBe(mockNode);
		});
	});
});
