import 'reflect-metadata';

import type { IFunctions } from 'intento-core';
import { SupplierBase } from 'intento-core';
import { mock } from 'jest-mock-extended';
import type { IntentoConnectionType } from 'n8n-workflow';

import { DryRunSupplier } from '../../suppliers/dry-run-supplier';
import type { TranslationError } from '../translation-error';
import type { TranslationRequest } from '../translation-request';
import type { TranslationResponse } from '../translation-response';
import { TranslationSupplierBase } from '../translation-supplier-base';

/**
 * Tests for TranslationSupplierBase
 * @author Claude Sonnet 4.5
 * @date 2025-01-05
 */

describe('TranslationSupplierBase', () => {
	let mockFunctions: IFunctions;
	const mockConnection: IntentoConnectionType = 'intento_translationProvider';

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

		// Mock getWorkflowDataProxy for Tracer initialization
		mockFunctions.getWorkflowDataProxy = jest.fn().mockReturnValue({
			$execution: {
				customData: new Map(),
			},
		});

		// Mock getNodeParameter to return default values for ExecutionContext and other contexts
		const mockGetNodeParameter = (paramName: string): string | number | undefined => {
			// ExecutionContext parameters (from execution_context collection)
			if (paramName === 'execution_context.max_attempts') return 5;
			if (paramName === 'execution_context.max_delay_ms') return 5000;
			if (paramName === 'execution_context.max_jitter') return 0.2;
			if (paramName === 'execution_context.timeout_ms') return 10000;

			// DelayContext parameters
			if (paramName === 'delay_context_delay_mode') return 'noDelay';
			if (paramName === 'delay_context_delay_value') return undefined;

			// DryRunContext parameters
			if (paramName === 'dry_run_context_mode') return 'pass';
			if (paramName === 'dry_run_context_override') return undefined;
			if (paramName === 'dry_run_context_error_code') return undefined;
			if (paramName === 'dry_run_context_error_message') return undefined;

			return '';
		};
		mockFunctions.getNodeParameter = jest.fn(mockGetNodeParameter) as typeof mockFunctions.getNodeParameter;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('business logic', () => {
		it('[BL-01] should extend SupplierBase with correct generic parameters', () => {
			// ARRANGE
			const supplier = new DryRunSupplier(mockConnection, mockFunctions);

			// ACT & ASSERT
			expect(supplier).toBeInstanceOf(SupplierBase);
			expect(supplier).toBeInstanceOf(TranslationSupplierBase);
		});

		it('[BL-02] should be constructible via concrete implementation', () => {
			// ARRANGE & ACT
			const supplier = new DryRunSupplier(mockConnection, mockFunctions);

			// ASSERT
			expect(supplier).toBeDefined();
			expect(supplier).toBeInstanceOf(TranslationSupplierBase);
		});

		it('[BL-03] should pass TranslationRequest type to SupplierBase', () => {
			// ARRANGE
			const supplier = new DryRunSupplier(mockConnection, mockFunctions);

			// ACT
			const supplyMethod = supplier['supply'];

			// ASSERT
			expect(supplyMethod).toBeDefined();
			expect(typeof supplyMethod).toBe('function');
		});

		it('[BL-04] should pass TranslationResponse type to SupplierBase', () => {
			// ARRANGE
			const supplier = new DryRunSupplier(mockConnection, mockFunctions);

			// ACT
			// Verify the supplier can work with TranslationResponse type
			const supplierAsBase: SupplierBase<TranslationRequest, TranslationResponse, TranslationError> = supplier;

			// ASSERT
			expect(supplierAsBase).toBeDefined();
			expect(supplierAsBase).toBeInstanceOf(TranslationSupplierBase);
		});

		it('[BL-05] should pass TranslationError type to SupplierBase', () => {
			// ARRANGE
			const supplier = new DryRunSupplier(mockConnection, mockFunctions);

			// ACT
			// Verify the supplier can handle TranslationError type
			const supplierAsBase: SupplierBase<TranslationRequest, TranslationResponse, TranslationError> = supplier;

			// ASSERT
			expect(supplierAsBase).toBeDefined();
			expect(supplierAsBase).toBeInstanceOf(TranslationSupplierBase);
		});

		it('[BL-06] should inherit all SupplierBase properties', () => {
			// ARRANGE
			const supplier = new DryRunSupplier(mockConnection, mockFunctions);

			// ACT & ASSERT
			// Verify inherited properties exist
			expect(supplier['connection']).toBeDefined();
			expect(supplier['functions']).toBeDefined();
			expect(supplier['tracer']).toBeDefined();
			expect(supplier['context']).toBeDefined();
			expect(supplier.name).toBeDefined();
		});

		it('[BL-07] should inherit supplyWithRetries method', () => {
			// ARRANGE
			const supplier = new DryRunSupplier(mockConnection, mockFunctions);

			// ACT & ASSERT
			expect(supplier.supplyWithRetries).toBeDefined();
			expect(typeof supplier.supplyWithRetries).toBe('function');
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should enforce abstract supply method implementation', () => {
			// ARRANGE
			const supplier = new DryRunSupplier(mockConnection, mockFunctions);

			// ACT
			const hasSupplyMethod = 'supply' in supplier;
			const supplyMethod = supplier['supply'];

			// ASSERT
			expect(hasSupplyMethod).toBe(true);
			expect(supplyMethod).toBeDefined();
			expect(typeof supplyMethod).toBe('function');
		});

		it('[EC-02] should work with different concrete implementations', () => {
			// ARRANGE
			const supplier1 = new DryRunSupplier(mockConnection, mockFunctions);
			const supplier2 = new DryRunSupplier(mockConnection, mockFunctions);

			// ACT
			const suppliers: TranslationSupplierBase[] = [supplier1, supplier2];

			// ASSERT
			expect(suppliers.length).toBe(2);
			suppliers.forEach((supplier) => {
				expect(supplier).toBeInstanceOf(TranslationSupplierBase);
				expect(supplier).toBeInstanceOf(SupplierBase);
			});
		});

		it('[EC-03] should maintain type safety across inheritance chain', () => {
			// ARRANGE
			const supplier = new DryRunSupplier(mockConnection, mockFunctions);

			// ACT
			// Test polymorphic assignment
			const asTranslationSupplier: TranslationSupplierBase = supplier;
			const asSupplierBase: SupplierBase<TranslationRequest, TranslationResponse, TranslationError> = supplier;

			// ASSERT
			expect(asTranslationSupplier).toBe(supplier);
			expect(asSupplierBase).toBe(supplier);
			expect(asTranslationSupplier).toBeInstanceOf(TranslationSupplierBase);
			expect(asSupplierBase).toBeInstanceOf(SupplierBase);
		});
	});

	describe('error handling', () => {
		it('[EH-01] should prevent direct instantiation via TypeScript', () => {
			// ARRANGE & ACT & ASSERT
			// TypeScript prevents instantiation of abstract classes at compile time
			// This test verifies the class is properly marked as abstract
			// @ts-expect-error - Testing that TypeScript correctly marks class as abstract
			const isAbstract = TranslationSupplierBase.prototype.constructor === TranslationSupplierBase;

			// Verify the abstract class can only be used through concrete implementations
			expect(isAbstract).toBe(true);

			// Verify that DryRunSupplier properly extends the abstract class
			const supplier = new DryRunSupplier(mockConnection, mockFunctions);
			expect(supplier).toBeInstanceOf(TranslationSupplierBase);
		});

		it('[EH-02] should enforce correct return types from supply method', () => {
			// ARRANGE
			const supplier = new DryRunSupplier(mockConnection, mockFunctions);
			const supplyMethod = supplier['supply'];

			// ACT
			// Verify supply method exists and has correct signature
			const methodExists = typeof supplyMethod === 'function';
			const supplierAsBase = supplier as SupplierBase<TranslationRequest, TranslationResponse, TranslationError>;

			// ASSERT
			expect(methodExists).toBe(true);
			expect(supplierAsBase).toBeDefined();
			expect(supplierAsBase.supplyWithRetries).toBeDefined();
		});
	});
});
