import 'reflect-metadata';

import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { TranslationError } from '../translation-error';
import { TranslationRequest } from '../translation-request';

/**
 * Tests for TranslationError
 * @author Claude Sonnet 4.5
 * @date 2025-01-05
 */

describe('TranslationError', () => {
	describe('business logic', () => {
		it('[BL-01] should create error with all request parameters', () => {
			// ARRANGE
			const request = new TranslationRequest('Hello, world!', 'es', 'en');

			// ACT
			const error = new TranslationError(request, 500, 'Internal server error');

			// ASSERT
			expect(error.text).toBe('Hello, world!');
			expect(error.to).toBe('es');
			expect(error.from).toBe('en');
			expect(error.code).toBe(500);
			expect(error.reason).toBe('Internal server error');
		});

		it('[BL-02] should create error without from language', () => {
			// ARRANGE
			const request = new TranslationRequest('Bonjour', 'en');

			// ACT
			const error = new TranslationError(request, 404, 'Not found');

			// ASSERT
			expect(error.text).toBe('Bonjour');
			expect(error.to).toBe('en');
			expect(error.from).toBeUndefined();
			expect(error.code).toBe(404);
			expect(error.reason).toBe('Not found');
		});

		it('[BL-03] should inherit requestId from base class', () => {
			// ARRANGE
			const request = new TranslationRequest('Test', 'fr');

			// ACT
			const error = new TranslationError(request, 400, 'Bad request');

			// ASSERT
			expect(error.requestId).toBeDefined();
			expect(typeof error.requestId).toBe('string');
			expect(error.requestId).toBe(request.requestId);
		});

		it('[BL-04] should inherit latencyMs from base class', () => {
			// ARRANGE
			const request = new TranslationRequest('Test', 'de');

			// ACT
			const error = new TranslationError(request, 503, 'Service unavailable');

			// ASSERT
			expect(error.latencyMs).toBeDefined();
			expect(typeof error.latencyMs).toBe('number');
			expect(error.latencyMs).toBeGreaterThanOrEqual(0);
		});

		it('[BL-05] should freeze instance after construction', () => {
			// ARRANGE
			const request = new TranslationRequest('Test', 'ja');

			// ACT
			const error = new TranslationError(request, 429, 'Rate limit exceeded');

			// ASSERT
			expect(Object.isFrozen(error)).toBe(true);

			// Verify property modification fails
			expect(() => {
				(error as { code: number }).code = 200;
			}).toThrow();
		});

		it('[BL-06] should return correct log metadata', () => {
			// ARRANGE
			const request = new TranslationRequest('Hello', 'es', 'en');
			const error = new TranslationError(request, 500, 'Server error');

			// ACT
			const metadata = error.asLogMetadata();

			// ASSERT
			expect(metadata).toHaveProperty('requestId', error.requestId);
			expect(metadata).toHaveProperty('from', 'en');
			expect(metadata).toHaveProperty('to', 'es');
			expect(metadata).toHaveProperty('errorCode', 500);
			expect(metadata).toHaveProperty('errorReason', 'Server error');
			expect(metadata).toHaveProperty('latencyMs');
			expect(metadata).not.toHaveProperty('text'); // Text excluded from logs
		});

		it('[BL-07] should return log metadata without from language', () => {
			// ARRANGE
			const request = new TranslationRequest('Text', 'fr');
			const error = new TranslationError(request, 401, 'Unauthorized');

			// ACT
			const metadata = error.asLogMetadata();

			// ASSERT
			expect(metadata).toHaveProperty('from', undefined);
			expect(metadata).toHaveProperty('to', 'fr');
			expect(metadata).toHaveProperty('errorCode', 401);
		});

		it('[BL-08] should return execution data with all fields', () => {
			// ARRANGE
			const request = new TranslationRequest('Test text', 'de', 'en');
			const error = new TranslationError(request, 503, 'Service unavailable');

			// ACT
			const executionData = error.asExecutionData();

			// ASSERT
			expect(executionData).toHaveLength(1);
			expect(executionData[0]).toHaveLength(1);
			expect(executionData[0][0].json).toEqual({
				requestId: error.requestId,
				from: 'en',
				to: 'de',
				text: 'Test text',
				errorCode: 503,
				errorReason: 'Service unavailable',
				latencyMs: error.latencyMs,
			});
		});

		it('[BL-09] should return execution data without from language', () => {
			// ARRANGE
			const request = new TranslationRequest('Sample', 'it');
			const error = new TranslationError(request, 400, 'Bad request');

			// ACT
			const executionData = error.asExecutionData();

			// ASSERT
			expect(executionData[0][0].json).toHaveProperty('from', undefined);
			expect(executionData[0][0].json).toHaveProperty('to', 'it');
			expect(executionData[0][0].json).toHaveProperty('text', 'Sample');
		});

		it('[BL-10] should create NodeOperationError with correct message', () => {
			// ARRANGE
			const request = new TranslationRequest('Text', 'ru');
			const error = new TranslationError(request, 429, 'Rate limit exceeded');
			const mockNode: INode = {
				id: 'node-123',
				name: 'Translation Node',
				typeVersion: 1,
				type: 'n8n-nodes-base.translate',
				position: [0, 0],
				parameters: {},
			};

			// ACT
			const nodeError = error.asError(mockNode);

			// ASSERT
			expect(nodeError).toBeInstanceOf(NodeOperationError);
			expect(nodeError.message).toBe('🌍 Translation has been failed: [429] Rate limit exceeded');
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should handle empty text in error', () => {
			// ARRANGE
			const request = new TranslationRequest('', 'en');

			// ACT
			const error = new TranslationError(request, 400, 'Empty text');

			// ASSERT
			expect(error.text).toBe('');
			expect(error.asExecutionData()[0][0].json.text).toBe('');
		});

		it('[EC-02] should handle error code 0', () => {
			// ARRANGE
			const request = new TranslationRequest('Test', 'en');

			// ACT
			const error = new TranslationError(request, 0, 'Unknown error');

			// ASSERT
			expect(error.code).toBe(0);
			expect(error.asLogMetadata().errorCode).toBe(0);
		});

		it('[EC-03] should handle large error codes', () => {
			// ARRANGE
			const request = new TranslationRequest('Test', 'en');

			// ACT
			const error = new TranslationError(request, 999, 'Custom error');

			// ASSERT
			expect(error.code).toBe(999);
			expect(error.asLogMetadata().errorCode).toBe(999);
		});

		it('[EC-04] should handle empty error reason', () => {
			// ARRANGE
			const request = new TranslationRequest('Test', 'en');

			// ACT
			const error = new TranslationError(request, 500, '');

			// ASSERT
			expect(error.reason).toBe('');
			expect(error.asLogMetadata().errorReason).toBe('');
		});

		it('[EC-05] should handle multi-line error reason', () => {
			// ARRANGE
			const request = new TranslationRequest('Test', 'en');
			const multiLineReason = 'Error occurred\nDetails: Connection timeout\nRetry in 60s';

			// ACT
			const error = new TranslationError(request, 408, multiLineReason);

			// ASSERT
			expect(error.reason).toBe(multiLineReason);
			expect(error.asLogMetadata().errorReason).toBe(multiLineReason);
		});
	});

	describe('error handling', () => {
		it('[EH-01] should preserve error code in all outputs', () => {
			// ARRANGE
			const request = new TranslationRequest('Test', 'en');
			const error = new TranslationError(request, 404, 'Not found');

			// ACT
			const logMetadata = error.asLogMetadata();
			const executionData = error.asExecutionData();
			const mockNode: INode = {
				id: 'node-1',
				name: 'Test',
				typeVersion: 1,
				type: 'test',
				position: [0, 0],
				parameters: {},
			};
			const nodeError = error.asError(mockNode);

			// ASSERT
			expect(error.code).toBe(404);
			expect(logMetadata.errorCode).toBe(404);
			expect(executionData[0][0].json.errorCode).toBe(404);
			expect(nodeError.message).toContain('[404]');
		});

		it('[EH-02] should preserve error reason in all outputs', () => {
			// ARRANGE
			const request = new TranslationRequest('Test', 'en');
			const error = new TranslationError(request, 503, 'Service temporarily unavailable');

			// ACT
			const logMetadata = error.asLogMetadata();
			const executionData = error.asExecutionData();
			const mockNode: INode = {
				id: 'node-1',
				name: 'Test',
				typeVersion: 1,
				type: 'test',
				position: [0, 0],
				parameters: {},
			};
			const nodeError = error.asError(mockNode);

			// ASSERT
			expect(error.reason).toBe('Service temporarily unavailable');
			expect(logMetadata.errorReason).toBe('Service temporarily unavailable');
			expect(executionData[0][0].json.errorReason).toBe('Service temporarily unavailable');
			expect(nodeError.message).toContain('Service temporarily unavailable');
		});

		it('[EH-03] should format error message with code and reason', () => {
			// ARRANGE
			const request = new TranslationRequest('Test', 'en');
			const error = new TranslationError(request, 422, 'Unprocessable entity');
			const mockNode: INode = {
				id: 'node-1',
				name: 'Test',
				typeVersion: 1,
				type: 'test',
				position: [0, 0],
				parameters: {},
			};

			// ACT
			const nodeError = error.asError(mockNode);

			// ASSERT
			expect(nodeError.message).toBe('🌍 Translation has been failed: [422] Unprocessable entity');
		});
	});
});
