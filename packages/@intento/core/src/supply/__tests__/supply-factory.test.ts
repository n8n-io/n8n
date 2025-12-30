import { mock } from 'jest-mock-extended';
import type { AINodeConnectionType, IntentoConnectionType } from 'n8n-workflow';

import type { Tracer } from '../../tracing/tracer';
import type { IFunctions } from '../../types/functions-interface';
import { SupplyFactory } from '../supply-factory';

/**
 * Tests for SupplyFactory
 * @author Claude Sonnet 4.5
 * @date 2025-12-30
 */

interface TestSupplier {
	id: string;
	name: string;
	priority?: number;
}

describe('SupplyFactory', () => {
	let mockFunctions: IFunctions;
	let mockTracer: Tracer;
	const connectionType: IntentoConnectionType = 'intento_translationProvider';

	beforeEach(() => {
		mockFunctions = mock<IFunctions>();
		mockTracer = mock<Tracer>();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('business logic', () => {
		it('[BL-01] should retrieve multiple suppliers and return in LIFO order', async () => {
			// ARRANGE
			const supplier1: TestSupplier = { id: '1', name: 'First', priority: 3 };
			const supplier2: TestSupplier = { id: '2', name: 'Second', priority: 2 };
			const supplier3: TestSupplier = { id: '3', name: 'Third', priority: 1 };
			const suppliersArray = [supplier1, supplier2, supplier3];

			mockFunctions.getInputConnectionData = jest.fn().mockResolvedValue(suppliersArray);

			// ACT
			const result = await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

			// ASSERT
			expect(result).toHaveLength(3);
			expect(result[0]).toBe(supplier3); // Last connected = highest priority
			expect(result[1]).toBe(supplier2);
			expect(result[2]).toBe(supplier1); // First connected = lowest priority
			expect(mockFunctions.getInputConnectionData).toHaveBeenCalledWith(connectionType as AINodeConnectionType, 0);
		});

		it('[BL-02] should retrieve single supplier and wrap in array', async () => {
			// ARRANGE
			const supplier: TestSupplier = { id: '1', name: 'Only' };
			mockFunctions.getInputConnectionData = jest.fn().mockResolvedValue(supplier);

			// ACT
			const result = await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

			// ASSERT
			expect(result).toHaveLength(1);
			expect(result[0]).toBe(supplier);
			expect(Array.isArray(result)).toBe(true);
		});

		it('[BL-03] should return empty array when no suppliers connected', async () => {
			// ARRANGE
			mockFunctions.getInputConnectionData = jest.fn().mockResolvedValue(null);

			// ACT
			const result = await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

			// ASSERT
			expect(result).toEqual([]);
			expect(result).toHaveLength(0);
		});

		it('[BL-04] should log debug message when retrieving suppliers', async () => {
			// ARRANGE
			mockFunctions.getInputConnectionData = jest.fn().mockResolvedValue(null);

			// ACT
			await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

			// ASSERT
			expect(mockTracer.debug).toHaveBeenCalledWith(`🔮 Getting '${connectionType}' suppliers ...`);
		});

		it('[BL-05] should log debug message with count for multiple suppliers', async () => {
			// ARRANGE
			const suppliers = [
				{ id: '1', name: 'First' },
				{ id: '2', name: 'Second' },
			];
			mockFunctions.getInputConnectionData = jest.fn().mockResolvedValue(suppliers);

			// ACT
			await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

			// ASSERT
			expect(mockTracer.debug).toHaveBeenCalledWith(`🔮 Retrieved 2 suppliers for connection type '${connectionType}'`);
		});

		it('[BL-06] should log debug message for single supplier', async () => {
			// ARRANGE
			const supplier = { id: '1', name: 'Only' };
			mockFunctions.getInputConnectionData = jest.fn().mockResolvedValue(supplier);

			// ACT
			await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

			// ASSERT
			expect(mockTracer.debug).toHaveBeenCalledWith(`🔮 Retrieved 1 supplier for connection type '${connectionType}'`);
		});

		it('[BL-07] should log warning when no suppliers found', async () => {
			// ARRANGE
			mockFunctions.getInputConnectionData = jest.fn().mockResolvedValue(null);

			// ACT
			await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

			// ASSERT
			expect(mockTracer.warn).toHaveBeenCalledWith(`🔮 No suppliers found for connection type '${connectionType}'`);
		});

		it('[BL-08] should cast IntentoConnectionType to AINodeConnectionType', async () => {
			// ARRANGE
			mockFunctions.getInputConnectionData = jest.fn().mockResolvedValue(null);

			// ACT
			await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

			// ASSERT
			expect(mockFunctions.getInputConnectionData).toHaveBeenCalledWith(connectionType as AINodeConnectionType, 0);
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should handle empty array of suppliers', async () => {
			// ARRANGE
			mockFunctions.getInputConnectionData = jest.fn().mockResolvedValue([]);

			// ACT
			const result = await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

			// ASSERT
			expect(result).toEqual([]);
			expect(result).toHaveLength(0);
			expect(mockTracer.debug).toHaveBeenCalledWith(`🔮 Retrieved 0 suppliers for connection type '${connectionType}'`);
		});

		it('[EC-02] should preserve order when only one supplier in array', async () => {
			// ARRANGE
			const supplier: TestSupplier = { id: '1', name: 'Only' };
			mockFunctions.getInputConnectionData = jest.fn().mockResolvedValue([supplier]);

			// ACT
			const result = await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

			// ASSERT
			expect(result).toHaveLength(1);
			expect(result[0]).toBe(supplier);
		});

		it('[EC-03] should handle large number of suppliers', async () => {
			// ARRANGE
			const suppliers: TestSupplier[] = Array.from({ length: 10 }, (_, i) => ({
				id: `${i + 1}`,
				name: `Supplier ${i + 1}`,
				priority: i + 1,
			}));
			mockFunctions.getInputConnectionData = jest.fn().mockResolvedValue(suppliers);

			// ACT
			const result = await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

			// ASSERT
			expect(result).toHaveLength(10);
			expect(result[0].id).toBe('10'); // Last element becomes first
			expect(result[9].id).toBe('1'); // First element becomes last
			expect(mockTracer.debug).toHaveBeenCalledWith(`🔮 Retrieved 10 suppliers for connection type '${connectionType}'`);
		});

		it('[EC-04] should handle suppliers with complex nested data', async () => {
			// ARRANGE
			const complexSupplier = {
				id: '1',
				name: 'Complex',
				config: {
					nested: {
						deep: {
							value: 'test',
						},
					},
					array: [1, 2, 3],
				},
			};
			mockFunctions.getInputConnectionData = jest.fn().mockResolvedValue([complexSupplier]);

			// ACT
			const result = await SupplyFactory.getSuppliers<typeof complexSupplier>(mockFunctions, connectionType, mockTracer);

			// ASSERT
			expect(result[0]).toBe(complexSupplier);
			expect(result[0].config.nested.deep.value).toBe('test');
			expect(result[0].config.array).toEqual([1, 2, 3]);
		});

		it('[EC-05] should correctly reverse order: last connected becomes first', async () => {
			// ARRANGE
			const first: TestSupplier = { id: 'first', name: 'Connected First' };
			const second: TestSupplier = { id: 'second', name: 'Connected Second' };
			const third: TestSupplier = { id: 'third', name: 'Connected Third (Latest)' };
			mockFunctions.getInputConnectionData = jest.fn().mockResolvedValue([first, second, third]);

			// ACT
			const result = await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

			// ASSERT - Verify LIFO ordering
			expect(result[0].id).toBe('third'); // Highest priority
			expect(result[1].id).toBe('second');
			expect(result[2].id).toBe('first'); // Lowest priority
		});
	});

	describe('error handling', () => {
		it('[EH-01] should propagate errors from getInputConnectionData', async () => {
			// ARRANGE
			const error = new Error('Connection failed');
			mockFunctions.getInputConnectionData = jest.fn().mockRejectedValue(error);

			// ACT & ASSERT
			await expect(SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer)).rejects.toThrow(
				'Connection failed',
			);
		});

		it('[EH-02] should handle null data as no suppliers', async () => {
			// ARRANGE
			mockFunctions.getInputConnectionData = jest.fn().mockResolvedValue(null);

			// ACT
			const result = await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

			// ASSERT
			expect(result).toEqual([]);
			expect(mockTracer.warn).toHaveBeenCalled();
		});

		it('[EH-03] should handle undefined data as no suppliers', async () => {
			// ARRANGE
			mockFunctions.getInputConnectionData = jest.fn().mockResolvedValue(undefined);

			// ACT
			const result = await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

			// ASSERT
			expect(result).toEqual([]);
			expect(mockTracer.warn).toHaveBeenCalled();
		});
	});
});
