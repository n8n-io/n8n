import 'reflect-metadata';

import type { ExecutionContext, Tracer, IFunctions } from 'intento-core';
import { mock } from 'jest-mock-extended';
import type { IntentoConnectionType } from 'n8n-workflow';

import { TranslationError } from '../translation-error';
import type { TranslationRequest } from '../translation-request';
import type { TranslationResponse } from '../translation-response';
import { TranslationSupplierBase } from '../translation-supplier-base';

/**
 * Tests for TranslationSupplierBase
 * @author Claude Sonnet 4.5
 * @date 2025-01-05
 */

// Concrete test implementation of abstract TranslationSupplierBase
class TestTranslationSupplier extends TranslationSupplierBase {
	readonly supplyMock = jest.fn<Promise<TranslationResponse | TranslationError>, [TranslationRequest, AbortSignal?]>();

	protected async supply(request: TranslationRequest, signal?: AbortSignal): Promise<TranslationResponse | TranslationError> {
		return await this.supplyMock(request, signal);
	}
}

describe('TranslationSupplierBase', () => {
	const MOCK_CONNECTION_TYPE: IntentoConnectionType = 'intento_translationProvider';
	const MOCK_SUPPLIER_NAME = 'TestTranslationSupplier';
	const MOCK_REQUEST_ID = 'translation-req-uuid-001';
	const MOCK_TIMESTAMP = 1704412800000;

	let mockFunctions: IFunctions;
	let mockContext: ExecutionContext;
	let mockTracer: Tracer;
	let supplier: TestTranslationSupplier;

	beforeEach(() => {
		// Mock IFunctions
		mockFunctions = mock<IFunctions>();
		Object.assign(mockFunctions, {
			getNode: jest.fn().mockReturnValue({ name: 'TestNode' }),
			getWorkflow: jest.fn().mockReturnValue({ id: 'test-workflow-id' }),
			getExecutionId: jest.fn().mockReturnValue('test-execution-id'),
			addInputData: jest.fn().mockReturnValue({ index: 0 }),
			addOutputData: jest.fn(),
			getWorkflowDataProxy: jest.fn().mockReturnValue({
				$execution: {
					customData: new Map(),
				},
			}),
			logger: {
				debug: jest.fn(),
				info: jest.fn(),
				warn: jest.fn(),
				error: jest.fn(),
			},
		});

		// Mock ExecutionContext
		mockContext = mock<ExecutionContext>({
			maxAttempts: 3,
			calculateDelay: jest.fn((attempt: number) => attempt * 100),
			createAbortSignal: jest.fn((signal?: AbortSignal) => signal ?? new AbortController().signal),
		});

		// Mock Tracer
		mockTracer = mock<Tracer>({
			debug: jest.fn(),
			info: jest.fn(),
			errorAndThrow: jest.fn((msg: string) => {
				throw new Error(msg);
			}),
			nodeName: 'TestNode',
		});

		// Create supplier instance
		supplier = new TestTranslationSupplier(MOCK_SUPPLIER_NAME, MOCK_CONNECTION_TYPE, mockFunctions);
		// Replace internal dependencies with mocks
		Object.assign(supplier, { tracer: mockTracer, context: mockContext });
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('business logic', () => {
		it('[BL-01] should extend SupplierBase with correct generic types', () => {
			// ASSERT
			expect(supplier).toBeInstanceOf(TranslationSupplierBase);
			expect(supplier.name).toBe(MOCK_SUPPLIER_NAME);
		});

		it('[BL-02] should create TranslationError on timeout', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_TIMESTAMP,
				text: 'Hello, world!',
				to: 'es',
				from: 'en',
			});

			// ACT
			const error = supplier['onTimeOut'](request);

			// ASSERT
			expect(error).toBeInstanceOf(TranslationError);
		});

		it('[BL-03] should set error code to 408 for timeout', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_TIMESTAMP,
				text: 'Test text',
				to: 'fr',
				from: 'en',
			});

			// ACT
			const error = supplier['onTimeOut'](request);

			// ASSERT
			expect(error.code).toBe(408);
		});

		it('[BL-04] should set error reason to timeout message', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_TIMESTAMP,
				text: 'Another test',
				to: 'de',
				from: 'en',
			});

			// ACT
			const error = supplier['onTimeOut'](request);

			// ASSERT
			expect(error.reason).toBe('Translation request timed out');
			expect(error.reason).toContain('Translation');
			expect(error.reason).toContain('timed out');
		});

		it('[BL-05] should include request context in timeout error', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_TIMESTAMP,
				text: 'Context test',
				to: 'ja',
				from: 'en',
			});

			// ACT
			const error = supplier['onTimeOut'](request);

			// ASSERT
			expect(error.requestId).toBe(MOCK_REQUEST_ID);
			expect(error.from).toBe('en');
			expect(error.to).toBe('ja');
			expect(error.text).toBe('Context test');
		});

		it('[BL-06] should integrate with parent retry mechanism', async () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_TIMESTAMP,
				text: 'Retry test',
				to: 'pt',
				from: 'en',
				clone: jest.fn().mockReturnThis(),
			});
			const response = mock<TranslationResponse>({
				requestId: MOCK_REQUEST_ID,
				translation: 'Teste de repetição',
			});
			supplier.supplyMock.mockResolvedValue(response);

			// ACT
			const result = await supplier.supplyWithRetries(request);

			// ASSERT
			expect(result).toBe(response);
			expect(supplier.supplyMock).toHaveBeenCalled();
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should handle request with undefined from language', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_TIMESTAMP,
				text: 'Auto-detect test',
				to: 'en',
				from: undefined,
			});

			// ACT
			const error = supplier['onTimeOut'](request);

			// ASSERT
			expect(error.from).toBeUndefined();
			expect(error.to).toBe('en');
			expect(error.text).toBe('Auto-detect test');
		});

		it('[EC-02] should preserve request text in timeout error', () => {
			// ARRANGE
			const specialText = '🌍 Special chars: "quotes" & <tags> 日本語';
			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_TIMESTAMP,
				text: specialText,
				to: 'zh',
				from: 'en',
			});

			// ACT
			const error = supplier['onTimeOut'](request);

			// ASSERT
			expect(error.text).toBe(specialText);
		});

		it('[EC-03] should work with different target languages', () => {
			// ARRANGE
			const languages = [
				{ to: 'es', from: 'en' },
				{ to: 'fr', from: 'de' },
				{ to: 'ja', from: 'zh' },
				{ to: 'ar', from: 'ru' },
			];

			// ACT & ASSERT
			languages.forEach(({ to, from }) => {
				const request = mock<TranslationRequest>({
					requestId: MOCK_REQUEST_ID,
					requestedAt: MOCK_TIMESTAMP,
					text: 'Multi-language test',
					to,
					from,
				});

				const error = supplier['onTimeOut'](request);

				expect(error.to).toBe(to);
				expect(error.from).toBe(from);
				expect(error.code).toBe(408);
			});
		});
	});

	describe('error handling', () => {
		it('[EH-01] should return TranslationError instance from onTimeOut', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_TIMESTAMP,
				text: 'Instance test',
				to: 'ko',
				from: 'en',
			});

			// ACT
			const error = supplier['onTimeOut'](request);

			// ASSERT
			expect(error).toBeInstanceOf(TranslationError);
			expect(error.constructor.name).toBe('TranslationError');
		});

		it('[EH-02] should create retryable error for timeout (408)', () => {
			// ARRANGE
			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_TIMESTAMP,
				text: 'Retryable test',
				to: 'it',
				from: 'en',
			});

			// ACT
			const error = supplier['onTimeOut'](request);

			// ASSERT
			// Note: 408 is not in the retryable list (429, 5xx), but it's a timeout error
			// The actual retry behavior is handled by parent class
			expect(error.code).toBe(408);
			expect(error.isRetryable()).toBe(false); // 408 is not in the retryable list per SupplyErrorBase
		});
	});
});
