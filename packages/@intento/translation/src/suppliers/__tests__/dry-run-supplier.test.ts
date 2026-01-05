import 'reflect-metadata';

import type { IFunctions } from 'intento-core';
import { ContextFactory, Delay, ExecutionContext } from 'intento-core';
import { mock } from 'jest-mock-extended';
import type { IntentoConnectionType } from 'n8n-workflow';

import { DelayContext } from '../../context/delay-context';
import { DryRunContext } from '../../context/dry-run-context';
import { TranslationError } from '../../supply/translation-error';
import { TranslationRequest } from '../../supply/translation-request';
import { TranslationResponse } from '../../supply/translation-response';
import { TranslationSupplierBase } from '../../supply/translation-supplier-base';
import { DryRunSupplier } from '../dry-run-supplier';

/**
 * Tests for DryRunSupplier
 * @author Claude Sonnet 4.5
 * @date 2025-01-05
 */

describe('DryRunSupplier', () => {
	let mockFunctions: IFunctions;
	const mockConnection: IntentoConnectionType = 'intento_translationProvider';
	let mockExecutionContext: ExecutionContext;
	let mockDelayContext: DelayContext;
	let mockDryRunContext: DryRunContext;

	beforeEach(() => {
		mockFunctions = mock<IFunctions>();
		mockFunctions.getNode = jest.fn().mockReturnValue({ name: 'TestNode', type: 'n8n-nodes-base.test' });
		mockFunctions.getWorkflow = jest.fn().mockReturnValue({ id: 'workflow-123', name: 'Test Workflow' });
		mockFunctions.getExecutionId = jest.fn().mockReturnValue('execution-456');
		mockFunctions.logger = {
			error: jest.fn(),
			warn: jest.fn(),
			info: jest.fn(),
			debug: jest.fn(),
		};

		mockFunctions.getWorkflowDataProxy = jest.fn().mockReturnValue({
			$execution: {
				customData: new Map(),
			},
		});

		const mockGetNodeParameter = (paramName: string): string | number | undefined => {
			if (paramName === 'execution_context.max_attempts') return 5;
			if (paramName === 'execution_context.max_delay_ms') return 5000;
			if (paramName === 'execution_context.max_jitter') return 0.2;
			if (paramName === 'execution_context.timeout_ms') return 10000;
			if (paramName === 'delay_context_delay_mode') return 'noDelay';
			if (paramName === 'delay_context_delay_value') return undefined;
			if (paramName === 'dry_run_context_mode') return 'pass';
			if (paramName === 'dry_run_context_override') return undefined;
			if (paramName === 'dry_run_context_error_code') return undefined;
			if (paramName === 'dry_run_context_error_message') return undefined;
			return '';
		};
		mockFunctions.getNodeParameter = jest.fn(mockGetNodeParameter) as typeof mockFunctions.getNodeParameter;

		mockExecutionContext = mock<ExecutionContext>();
		mockExecutionContext.maxAttempts = 5;
		mockExecutionContext.maxDelayMs = 5000;
		mockExecutionContext.maxJitter = 0.2;
		mockExecutionContext.timeoutMs = 10000;

		mockDelayContext = mock<DelayContext>();
		mockDelayContext.calculateDelay = jest.fn().mockReturnValue(0);

		mockDryRunContext = mock<DryRunContext>();
		mockDryRunContext.mode = 'pass';
	});

	afterEach(() => {
		jest.clearAllMocks();
		jest.restoreAllMocks();
	});

	/**
	 * Helper to mock ContextFactory.read for all required contexts
	 */
	const mockContextFactory = () => {
		jest.spyOn(ContextFactory, 'read').mockImplementation((contextClass) => {
			if (contextClass === ExecutionContext) return mockExecutionContext;
			if (contextClass === DelayContext) return mockDelayContext;
			if (contextClass === DryRunContext) return mockDryRunContext;
			throw new Error(`Unexpected context class: ${contextClass.name}`);
		});
	};

	describe('business logic', () => {
		it('[BL-01] should extend TranslationSupplierBase', () => {
			// ARRANGE & ACT
			const supplier = new DryRunSupplier(mockConnection, mockFunctions);

			// ASSERT
			expect(supplier).toBeInstanceOf(TranslationSupplierBase);
			expect(supplier).toBeInstanceOf(DryRunSupplier);
		});

		it('[BL-02] should construct with connection and functions', () => {
			// ARRANGE & ACT
			const supplier = new DryRunSupplier(mockConnection, mockFunctions);

			// ASSERT
			expect(supplier).toBeDefined();
			expect(supplier.name).toBe('dry-run-supplier');
		});

		it('[BL-03] should read DelayContext during construction', () => {
			// ARRANGE
			const readSpy = jest.spyOn(ContextFactory, 'read');

			// ACT
			new DryRunSupplier(mockConnection, mockFunctions);

			// ASSERT
			expect(readSpy).toHaveBeenCalledWith(DelayContext, mockFunctions, expect.anything());
		});

		it('[BL-04] should read DryRunContext during construction', () => {
			// ARRANGE
			const readSpy = jest.spyOn(ContextFactory, 'read');

			// ACT
			new DryRunSupplier(mockConnection, mockFunctions);

			// ASSERT
			expect(readSpy).toHaveBeenCalledWith(DryRunContext, mockFunctions, expect.anything());
		});

		it('[BL-05] should freeze instance after construction', () => {
			// ARRANGE & ACT
			const supplier = new DryRunSupplier(mockConnection, mockFunctions);

			// ASSERT
			expect(Object.isFrozen(supplier)).toBe(true);
		});

		it('[BL-06] should return original text in pass mode', async () => {
			// ARRANGE
			mockDryRunContext.mode = 'pass';
			mockContextFactory();

			const supplier = new DryRunSupplier(mockConnection, mockFunctions);
			const request = new TranslationRequest('Hello, world!', 'es', 'en');

			// ACT
			const result = await supplier['supply'](request);

			// ASSERT
			expect(result).toBeInstanceOf(TranslationResponse);
			const response = result as TranslationResponse;
			expect(response.text).toBe('Hello, world!');
			expect(response.detectedLanguage).toBe('en');
		});

		it('[BL-07] should return override text in override mode', async () => {
			// ARRANGE
			mockDryRunContext.mode = 'override';
			mockDryRunContext.override = 'Overridden text';
			mockContextFactory();

			const supplier = new DryRunSupplier(mockConnection, mockFunctions);
			const request = new TranslationRequest('Hello, world!', 'es', 'en');

			// ACT
			const result = await supplier['supply'](request);

			// ASSERT
			expect(result).toBeInstanceOf(TranslationResponse);
			const response = result as TranslationResponse;
			expect(response.translation).toBe('Overridden text');
			expect(response.detectedLanguage).toBe('en');
		});

		it('[BL-08] should return error in fail mode', async () => {
			// ARRANGE
			mockDryRunContext.mode = 'fail';
			mockDryRunContext.errorCode = 'TEST_ERROR';
			mockDryRunContext.errorMessage = 'Test error message';
			mockContextFactory();

			const supplier = new DryRunSupplier(mockConnection, mockFunctions);
			const request = new TranslationRequest('Hello, world!', 'es', 'en');

			// ACT
			const result = await supplier['supply'](request);

			// ASSERT
			expect(result).toBeInstanceOf(TranslationError);
			const error = result as TranslationError;
			expect(error.code).toBe('TEST_ERROR');
			expect(error.reason).toBe('Test error message');
		});

		it('[BL-09] should apply delay before processing', async () => {
			// ARRANGE
			const delaySpy = jest.spyOn(Delay, 'apply').mockResolvedValue();
			mockDelayContext.calculateDelay = jest.fn().mockReturnValue(1000);
			mockDryRunContext.mode = 'pass';
			mockContextFactory();

			const supplier = new DryRunSupplier(mockConnection, mockFunctions);
			const request = new TranslationRequest('Test', 'es');

			// ACT
			await supplier['supply'](request);

			// ASSERT
			expect(mockDelayContext.calculateDelay).toHaveBeenCalled();
			expect(delaySpy).toHaveBeenCalledWith(1000, undefined);
		});

		it('[BL-10] should check abort signal before processing', async () => {
			// ARRANGE
			mockDryRunContext.mode = 'pass';
			mockContextFactory();

			const supplier = new DryRunSupplier(mockConnection, mockFunctions);
			const request = new TranslationRequest('Test', 'es');
			const abortController = new AbortController();
			const signal = abortController.signal;

			// Create a spy on the signal's throwIfAborted method
			const throwIfAbortedSpy = jest.spyOn(signal, 'throwIfAborted');

			// ACT
			await supplier['supply'](request, signal);

			// ASSERT
			expect(throwIfAbortedSpy).toHaveBeenCalled();
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should handle zero delay configuration', async () => {
			// ARRANGE
			const delaySpy = jest.spyOn(Delay, 'apply').mockResolvedValue();
			mockDelayContext.calculateDelay = jest.fn().mockReturnValue(0);
			mockDryRunContext.mode = 'pass';
			mockContextFactory();

			const supplier = new DryRunSupplier(mockConnection, mockFunctions);
			const request = new TranslationRequest('Test', 'es');

			// ACT
			await supplier['supply'](request);

			// ASSERT
			expect(delaySpy).toHaveBeenCalledWith(0, undefined);
		});

		it('[EC-02] should preserve request metadata in responses', async () => {
			// ARRANGE
			mockDryRunContext.mode = 'pass';
			mockContextFactory();

			const supplier = new DryRunSupplier(mockConnection, mockFunctions);
			const request = new TranslationRequest('Original text', 'fr', 'en');

			// ACT
			const result = await supplier['supply'](request);

			// ASSERT
			expect(result).toBeInstanceOf(TranslationResponse);
			const response = result as TranslationResponse;
			expect(response.requestId).toBe(request.requestId);
		});

		it('[EC-03] should work with undefined from language', async () => {
			// ARRANGE
			mockDryRunContext.mode = 'pass';
			mockContextFactory();

			const supplier = new DryRunSupplier(mockConnection, mockFunctions);
			const request = new TranslationRequest('Bonjour', 'en'); // No source language

			// ACT
			const result = await supplier['supply'](request);

			// ASSERT
			expect(result).toBeInstanceOf(TranslationResponse);
			const response = result as TranslationResponse;
			expect(response.text).toBe('Bonjour');
			expect(response.detectedLanguage).toBeUndefined();
		});
	});

	describe('error handling', () => {
		it('[EH-01] should throw when signal is aborted', async () => {
			// ARRANGE
			mockDryRunContext.mode = 'pass';
			mockContextFactory();

			const supplier = new DryRunSupplier(mockConnection, mockFunctions);
			const request = new TranslationRequest('Test', 'es');
			const abortController = new AbortController();
			abortController.abort();

			// ACT & ASSERT
			await expect(supplier['supply'](request, abortController.signal)).rejects.toThrow();
		});

		it('[EH-02] should respect signal during delay', async () => {
			// ARRANGE
			const delaySpy = jest.spyOn(Delay, 'apply').mockResolvedValue();
			mockDelayContext.calculateDelay = jest.fn().mockReturnValue(5000);
			mockDryRunContext.mode = 'pass';
			mockContextFactory();

			const supplier = new DryRunSupplier(mockConnection, mockFunctions);
			const request = new TranslationRequest('Test', 'es');
			const abortController = new AbortController();
			const signal = abortController.signal;

			// ACT
			await supplier['supply'](request, signal);

			// ASSERT
			expect(delaySpy).toHaveBeenCalledWith(5000, signal);
		});
	});
});
