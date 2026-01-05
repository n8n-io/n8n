import 'reflect-metadata';

import { ContextFactory, Delay, type IFunctions } from 'intento-core';
import { mock, mockDeep } from 'jest-mock-extended';
import type { IntentoConnectionType } from 'n8n-workflow';

import type { DelayContext } from '../../context/delay-context';
import type { DryRunContext } from '../../context/dry-run-context';
import { TranslationError } from '../../supply/translation-error';
import type { TranslationRequest } from '../../supply/translation-request';
import { TranslationResponse } from '../../supply/translation-response';
import { DryRunSupplier } from '../dry-run-supplier';

/**
 * Tests for DryRunSupplier
 * @author Claude Sonnet 4.5
 * @date 2025-01-05
 */

describe('DryRunSupplier', () => {
	const MOCK_CONNECTION_TYPE: IntentoConnectionType = 'intento_translationProvider';
	const MOCK_REQUEST_ID = 'dry-run-req-001';
	const MOCK_TIMESTAMP = 1704412800000;
	const MOCK_DELAY_MS = 500;

	let mockFunctions: IFunctions;
	let mockDelayContext: DelayContext;
	let mockDryRunContext: DryRunContext;
	let mockContextFactoryRead: jest.SpyInstance;
	let mockDelayApply: jest.SpyInstance;
	let supplier: DryRunSupplier;

	beforeEach(() => {
		jest.clearAllMocks();

		// Mock Delay.apply
		mockDelayApply = jest.spyOn(Delay, 'apply').mockResolvedValue(undefined);

		// Mock IFunctions
		mockFunctions = mock<IFunctions>();
		Object.assign(mockFunctions, {
			getNode: jest.fn().mockReturnValue({ name: 'DryRunNode' }),
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

		// Default mock contexts
		mockDelayContext = mock<DelayContext>({
			calculateDelay: jest.fn().mockReturnValue(MOCK_DELAY_MS),
		});

		mockDryRunContext = mock<DryRunContext>({
			mode: 'pass',
		});

		// Mock ExecutionContext (required by parent SupplierBase)
		const mockExecutionContext = {
			maxAttempts: 3,
			calculateDelay: jest.fn((attempt: number) => attempt * 100),
			createAbortSignal: jest.fn((signal?: AbortSignal) => signal ?? new AbortController().signal),
		};

		// Mock ContextFactory.read
		mockContextFactoryRead = jest.spyOn(ContextFactory, 'read');
		mockContextFactoryRead.mockImplementation((contextClass: { name: string }) => {
			if (contextClass.name === 'DelayContext') return mockDelayContext;
			if (contextClass.name === 'DryRunContext') return mockDryRunContext;
			if (contextClass.name === 'ExecutionContext') return mockExecutionContext;
			throw new Error(`Unexpected context class: ${contextClass.name}`);
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('business logic', () => {
		it('[BL-01] should extend TranslationSupplierBase', () => {
			// ACT
			supplier = new DryRunSupplier(MOCK_CONNECTION_TYPE, mockFunctions);

			// ASSERT
			expect(supplier).toBeInstanceOf(DryRunSupplier);
			expect(supplier.name).toBe('dry-run-supplier');
		});

		it('[BL-02] should read DelayContext during construction', () => {
			// ACT
			supplier = new DryRunSupplier(MOCK_CONNECTION_TYPE, mockFunctions);

			// ASSERT
			expect(mockContextFactoryRead).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'DelayContext' }),
				mockFunctions,
				expect.anything(),
			);
			expect(supplier['delayContext']).toBe(mockDelayContext);
		});

		it('[BL-03] should read DryRunContext during construction', () => {
			// ACT
			supplier = new DryRunSupplier(MOCK_CONNECTION_TYPE, mockFunctions);

			// ASSERT
			expect(mockContextFactoryRead).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'DryRunContext' }),
				mockFunctions,
				expect.anything(),
			);
			expect(supplier['dryRunContext']).toBe(mockDryRunContext);
		});

		it('[BL-04] should freeze instance after construction', () => {
			// ACT
			supplier = new DryRunSupplier(MOCK_CONNECTION_TYPE, mockFunctions);

			// ASSERT
			expect(Object.isFrozen(supplier)).toBe(true);
		});

		it('[BL-05] should apply delay before processing in pass mode', async () => {
			// ARRANGE
			mockDryRunContext = mockDeep<DryRunContext>({ mode: 'pass' });
			supplier = new DryRunSupplier(MOCK_CONNECTION_TYPE, mockFunctions);

			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_TIMESTAMP,
				text: 'Test text',
				to: 'es',
				from: 'en',
			});

			// ACT
			await supplier['supply'](request);

			// ASSERT
			expect(mockDelayContext.calculateDelay).toHaveBeenCalled();
			expect(mockDelayApply).toHaveBeenCalledWith(MOCK_DELAY_MS, undefined);
		});

		it('[BL-06] should return original text in pass mode', async () => {
			// ARRANGE
			mockDryRunContext = mockDeep<DryRunContext>({ mode: 'pass' });
			supplier = new DryRunSupplier(MOCK_CONNECTION_TYPE, mockFunctions);

			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_TIMESTAMP,
				text: 'Original text',
				to: 'fr',
				from: 'en',
			});

			// ACT
			const result = await supplier['supply'](request);

			// ASSERT
			expect(result).toBeInstanceOf(TranslationResponse);
			if (result instanceof TranslationResponse) {
				expect(result.translation).toBe('Original text');
				expect(result.text).toBe('Original text');
			}
		});

		it('[BL-07] should return override text in override mode', async () => {
			// ARRANGE
			mockDryRunContext = mockDeep<DryRunContext>({
				mode: 'override',
				override: 'Predefined translation',
			});
			supplier = new DryRunSupplier(MOCK_CONNECTION_TYPE, mockFunctions);

			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_TIMESTAMP,
				text: 'Any text',
				to: 'de',
				from: 'en',
			});

			// ACT
			const result = await supplier['supply'](request);

			// ASSERT
			expect(result).toBeInstanceOf(TranslationResponse);
			if (result instanceof TranslationResponse) {
				expect(result.translation).toBe('Predefined translation');
				expect(result.text).toBe('Any text');
			}
		});

		it('[BL-08] should return error in fail mode', async () => {
			// ARRANGE
			mockDryRunContext = mockDeep<DryRunContext>({
				mode: 'fail',
				errorCode: 503,
				errorMessage: 'Service unavailable',
			});
			supplier = new DryRunSupplier(MOCK_CONNECTION_TYPE, mockFunctions);

			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_TIMESTAMP,
				text: 'Test text',
				to: 'ja',
				from: 'en',
			});

			// ACT
			const result = await supplier['supply'](request);

			// ASSERT
			expect(result).toBeInstanceOf(TranslationError);
			if (result instanceof TranslationError) {
				expect(result.code).toBe(503);
				expect(result.reason).toBe('Service unavailable');
			}
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should handle zero delay (noDelay mode)', async () => {
			// ARRANGE
			mockDelayContext.calculateDelay = jest.fn().mockReturnValue(0);
			mockDryRunContext = mockDeep<DryRunContext>({ mode: 'pass' });
			supplier = new DryRunSupplier(MOCK_CONNECTION_TYPE, mockFunctions);

			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_TIMESTAMP,
				text: 'Test',
				to: 'es',
			});

			// ACT
			await supplier['supply'](request);

			// ASSERT
			expect(mockDelayApply).toHaveBeenCalledWith(0, undefined);
		});

		it('[EC-02] should handle fixed delay', async () => {
			// ARRANGE
			const fixedDelay = 1000;
			mockDelayContext.calculateDelay = jest.fn().mockReturnValue(fixedDelay);
			mockDryRunContext = mockDeep<DryRunContext>({ mode: 'pass' });
			supplier = new DryRunSupplier(MOCK_CONNECTION_TYPE, mockFunctions);

			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_TIMESTAMP,
				text: 'Test',
				to: 'fr',
			});

			// ACT
			await supplier['supply'](request);

			// ASSERT
			expect(mockDelayApply).toHaveBeenCalledWith(fixedDelay, undefined);
		});

		it('[EC-03] should pass detected language in pass mode', async () => {
			// ARRANGE
			mockDryRunContext = mockDeep<DryRunContext>({ mode: 'pass' });
			supplier = new DryRunSupplier(MOCK_CONNECTION_TYPE, mockFunctions);

			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_TIMESTAMP,
				text: 'Test',
				to: 'en',
				from: 'de',
			});

			// ACT
			const result = await supplier['supply'](request);

			// ASSERT
			if (result instanceof TranslationResponse) {
				expect(result.detectedLanguage).toBe('de');
			}
		});

		it('[EC-04] should preserve request context in all modes', async () => {
			// ARRANGE
			const modes: Array<'pass' | 'override' | 'fail'> = ['pass', 'override', 'fail'];

			for (const mode of modes) {
				if (mode === 'pass') {
					mockDryRunContext = mockDeep<DryRunContext>({ mode: 'pass' });
				} else if (mode === 'override') {
					mockDryRunContext = mockDeep<DryRunContext>({
						mode: 'override',
						override: 'Override text',
					});
				} else {
					mockDryRunContext = mockDeep<DryRunContext>({
						mode: 'fail',
						errorCode: 400,
						errorMessage: 'Bad request',
					});
				}
				supplier = new DryRunSupplier(MOCK_CONNECTION_TYPE, mockFunctions);

				const request = mock<TranslationRequest>({
					requestId: MOCK_REQUEST_ID,
					requestedAt: MOCK_TIMESTAMP,
					text: 'Context test',
					to: 'es',
					from: 'en',
				});

				// ACT
				const result = await supplier['supply'](request);

				// ASSERT
				if (result instanceof TranslationResponse) {
					expect(result.to).toBe('es');
					expect(result.from).toBe('en');
				} else if (result instanceof TranslationError) {
					expect(result.to).toBe('es');
					expect(result.from).toBe('en');
					expect(result.text).toBe('Context test');
				}
			}
		});

		it('[EC-05] should handle undefined from language', async () => {
			// ARRANGE
			mockDryRunContext = mockDeep<DryRunContext>({ mode: 'pass' });
			supplier = new DryRunSupplier(MOCK_CONNECTION_TYPE, mockFunctions);

			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_TIMESTAMP,
				text: 'Test',
				to: 'en',
				from: undefined,
			});

			// ACT
			const result = await supplier['supply'](request);

			// ASSERT
			if (result instanceof TranslationResponse) {
				expect(result.from).toBeUndefined();
			}
		});

		it('[EC-06] should handle empty override text', async () => {
			// ARRANGE
			mockDryRunContext = mockDeep<DryRunContext>({
				mode: 'override',
				override: '',
			});
			supplier = new DryRunSupplier(MOCK_CONNECTION_TYPE, mockFunctions);

			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_TIMESTAMP,
				text: 'Test',
				to: 'es',
			});

			// ACT
			const result = await supplier['supply'](request);

			// ASSERT
			if (result instanceof TranslationResponse) {
				expect(result.translation).toBe('');
			}
		});

		it('[EC-07] should handle special characters in override', async () => {
			// ARRANGE
			const specialText = '🌍 Special: "quotes" & <tags> 日本語';
			mockDryRunContext = mockDeep<DryRunContext>({
				mode: 'override',
				override: specialText,
			});
			supplier = new DryRunSupplier(MOCK_CONNECTION_TYPE, mockFunctions);

			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_TIMESTAMP,
				text: 'Test',
				to: 'ja',
			});

			// ACT
			const result = await supplier['supply'](request);

			// ASSERT
			if (result instanceof TranslationResponse) {
				expect(result.translation).toBe(specialText);
			}
		});
	});

	describe('error handling', () => {
		it('[EH-01] should check abort signal at entry', async () => {
			// ARRANGE
			mockDryRunContext = mockDeep<DryRunContext>({ mode: 'pass' });
			supplier = new DryRunSupplier(MOCK_CONNECTION_TYPE, mockFunctions);

			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_TIMESTAMP,
				text: 'Test',
				to: 'es',
			});

			// Create mock signal with throwIfAborted
			const mockSignal = {
				aborted: false,
				throwIfAborted: jest.fn(),
			} as unknown as AbortSignal;

			// ACT
			await supplier['supply'](request, mockSignal);

			// ASSERT
			expect(mockSignal.throwIfAborted).toHaveBeenCalled();
		});

		it('[EH-02] should throw if aborted before processing', async () => {
			// ARRANGE
			mockDryRunContext = mockDeep<DryRunContext>({ mode: 'pass' });
			supplier = new DryRunSupplier(MOCK_CONNECTION_TYPE, mockFunctions);

			const abortController = new AbortController();
			abortController.abort();

			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_TIMESTAMP,
				text: 'Test',
				to: 'es',
			});

			// ACT & ASSERT
			await expect(supplier['supply'](request, abortController.signal)).rejects.toThrow();
		});

		it('[EH-03] should create error with correct code in fail mode', async () => {
			// ARRANGE
			mockDryRunContext = mockDeep<DryRunContext>({
				mode: 'fail',
				errorCode: 429,
				errorMessage: 'Rate limit exceeded',
			});
			supplier = new DryRunSupplier(MOCK_CONNECTION_TYPE, mockFunctions);

			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_TIMESTAMP,
				text: 'Test',
				to: 'fr',
			});

			// ACT
			const result = await supplier['supply'](request);

			// ASSERT
			if (result instanceof TranslationError) {
				expect(result.code).toBe(429);
			}
		});

		it('[EH-04] should create error with correct message in fail mode', async () => {
			// ARRANGE
			mockDryRunContext = mockDeep<DryRunContext>({
				mode: 'fail',
				errorCode: 500,
				errorMessage: 'Internal server error',
			});
			supplier = new DryRunSupplier(MOCK_CONNECTION_TYPE, mockFunctions);

			const request = mock<TranslationRequest>({
				requestId: MOCK_REQUEST_ID,
				requestedAt: MOCK_TIMESTAMP,
				text: 'Test',
				to: 'de',
			});

			// ACT
			const result = await supplier['supply'](request);

			// ASSERT
			if (result instanceof TranslationError) {
				expect(result.reason).toBe('Internal server error');
			}
		});
	});
});
