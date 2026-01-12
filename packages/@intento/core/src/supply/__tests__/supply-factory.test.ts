import type { IntentoConnectionType } from 'n8n-workflow';

import type { Tracer } from '../../tracing/tracer';
import type { IFunctions } from '../../types/i-functions';
import { SupplyFactory } from '../supply-factory';

interface TestSupplier {
	id: string;
	name: string;
}

/**
 * Tests for SupplyFactory
 * @author Claude Sonnet 4.5
 * @date 2026-01-11
 */
describe('SupplyFactory', () => {
	describe('getSuppliers', () => {
		let mockFunctions: jest.Mocked<IFunctions>;
		let mockTracer: jest.Mocked<Tracer>;
		const connectionType: IntentoConnectionType = 'intento_translationSupplier';

		beforeEach(() => {
			mockFunctions = {
				getInputConnectionData: jest.fn(),
			} as unknown as jest.Mocked<IFunctions>;

			mockTracer = {
				debug: jest.fn(),
				warn: jest.fn(),
			} as unknown as jest.Mocked<Tracer>;
		});

		afterEach(() => {
			jest.clearAllMocks();
		});

		describe('business logic', () => {
			it('[BL-01] should return empty array when no suppliers connected', async () => {
				// ARRANGE
				mockFunctions.getInputConnectionData.mockResolvedValue(null);

				// ACT
				const result = await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

				// ASSERT
				expect(result).toEqual([]);
				expect(result).toHaveLength(0);
			});

			it('[BL-02] should return single supplier wrapped in array', async () => {
				// ARRANGE
				const supplier: TestSupplier = { id: '1', name: 'Supplier 1' };
				mockFunctions.getInputConnectionData.mockResolvedValue(supplier);

				// ACT
				const result = await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

				// ASSERT
				expect(result).toEqual([supplier]);
				expect(result).toHaveLength(1);
				expect(result[0]).toBe(supplier);
			});

			it('[BL-03] should return multiple suppliers in reversed order', async () => {
				// ARRANGE
				const supplier1: TestSupplier = { id: '1', name: 'Supplier 1' };
				const supplier2: TestSupplier = { id: '2', name: 'Supplier 2' };
				const supplier3: TestSupplier = { id: '3', name: 'Supplier 3' };
				mockFunctions.getInputConnectionData.mockResolvedValue([supplier1, supplier2, supplier3]);

				// ACT
				const result = await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

				// ASSERT
				expect(result).toHaveLength(3);
				expect(result[0]).toBe(supplier3);
				expect(result[1]).toBe(supplier2);
				expect(result[2]).toBe(supplier1);
			});

			it('[BL-04] should log debug message when retrieving suppliers', async () => {
				// ARRANGE
				mockFunctions.getInputConnectionData.mockResolvedValue(null);

				// ACT
				await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

				// ASSERT
				expect(mockTracer.debug).toHaveBeenCalledWith(`🔮 [Reflection] Getting '${connectionType}' suppliers ...`);
			});

			it('[BL-05] should log debug with count for multiple suppliers', async () => {
				// ARRANGE
				const suppliers = [
					{ id: '1', name: 'S1' },
					{ id: '2', name: 'S2' },
				];
				mockFunctions.getInputConnectionData.mockResolvedValue(suppliers);

				// ACT
				await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

				// ASSERT
				expect(mockTracer.debug).toHaveBeenCalledWith(`🔮 [Reflection] Retrieved 2 suppliers for connection type '${connectionType}'`);
			});

			it('[BL-06] should log debug for single supplier', async () => {
				// ARRANGE
				const supplier = { id: '1', name: 'Supplier 1' };
				mockFunctions.getInputConnectionData.mockResolvedValue(supplier);

				// ACT
				await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

				// ASSERT
				expect(mockTracer.debug).toHaveBeenCalledWith(`🔮 [Reflection] Retrieved 1 supplier for connection type '${connectionType}'`);
			});

			it('[BL-07] should log warning when no suppliers found', async () => {
				// ARRANGE
				mockFunctions.getInputConnectionData.mockResolvedValue(null);

				// ACT
				await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

				// ASSERT
				expect(mockTracer.warn).toHaveBeenCalledWith(`🔮 [Reflection] No suppliers found for connection type '${connectionType}'`);
			});
		});

		describe('edge cases', () => {
			it('[EC-01] should handle empty array as no suppliers', async () => {
				// ARRANGE
				mockFunctions.getInputConnectionData.mockResolvedValue([]);

				// ACT
				const result = await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

				// ASSERT
				expect(result).toEqual([]);
				expect(result).toHaveLength(0);
				expect(mockTracer.debug).toHaveBeenCalledWith(`🔮 [Reflection] Retrieved 0 suppliers for connection type '${connectionType}'`);
			});

			it('[EC-02] should reverse order correctly (RTL to LTR)', async () => {
				// ARRANGE - Simulate n8n RTL connection order
				const left: TestSupplier = { id: 'left', name: 'Left (highest priority)' };
				const middle: TestSupplier = { id: 'middle', name: 'Middle' };
				const right: TestSupplier = { id: 'right', name: 'Right (lowest priority)' };
				// n8n returns: [right, middle, left] (RTL order)
				mockFunctions.getInputConnectionData.mockResolvedValue([right, middle, left]);

				// ACT
				const result = await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

				// ASSERT - After reverse, should be LTR: [left, middle, right]
				expect(result[0]).toBe(left); // Leftmost = highest priority
				expect(result[1]).toBe(middle);
				expect(result[2]).toBe(right); // Rightmost = lowest priority
			});

			it('[EC-03] should handle array with one supplier', async () => {
				// ARRANGE
				const supplier: TestSupplier = { id: '1', name: 'Only Supplier' };
				mockFunctions.getInputConnectionData.mockResolvedValue([supplier]);

				// ACT
				const result = await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

				// ASSERT
				expect(result).toHaveLength(1);
				expect(result[0]).toBe(supplier);
			});

			it('[EC-04] should handle different connection types', async () => {
				// ARRANGE
				const supplier = { id: '1', name: 'Supplier' };
				mockFunctions.getInputConnectionData.mockResolvedValue(supplier);
				const customConnectionType: IntentoConnectionType = 'intento_segmentSupplier';

				// ACT
				const result = await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, customConnectionType, mockTracer);

				// ASSERT
				expect(result).toHaveLength(1);
				expect(mockTracer.debug).toHaveBeenCalledWith(`🔮 [Reflection] Getting '${customConnectionType}' suppliers ...`);
			});

			it('[EC-05] should preserve supplier type through generic', async () => {
				// ARRANGE
				interface CustomSupplier {
					customId: number;
					customField: string;
				}
				const customSupplier: CustomSupplier = { customId: 42, customField: 'test' };
				mockFunctions.getInputConnectionData.mockResolvedValue(customSupplier);

				// ACT
				const result = await SupplyFactory.getSuppliers<CustomSupplier>(mockFunctions, connectionType, mockTracer);

				// ASSERT
				expect(result).toHaveLength(1);
				expect(result[0].customId).toBe(42);
				expect(result[0].customField).toBe('test');
			});

			it('[EC-06] should handle null data as no suppliers', async () => {
				// ARRANGE
				mockFunctions.getInputConnectionData.mockResolvedValue(null);

				// ACT
				const result = await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

				// ASSERT
				expect(result).toEqual([]);
				expect(mockTracer.warn).toHaveBeenCalled();
			});

			it('[EC-07] should handle undefined data as no suppliers', async () => {
				// ARRANGE
				mockFunctions.getInputConnectionData.mockResolvedValue(undefined);

				// ACT
				const result = await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

				// ASSERT
				expect(result).toEqual([]);
				expect(mockTracer.warn).toHaveBeenCalled();
			});
		});

		describe('error handling', () => {
			it('[EH-01] should handle getInputConnectionData throwing error', async () => {
				// ARRANGE
				const error = new Error('Connection data retrieval failed');
				mockFunctions.getInputConnectionData.mockRejectedValue(error);

				// ACT & ASSERT
				await expect(SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer)).rejects.toThrow(
					'Connection data retrieval failed',
				);
			});

			it('[EH-02] should verify tracer methods are called correctly', async () => {
				// ARRANGE
				const suppliers = [{ id: '1', name: 'S1' }];
				mockFunctions.getInputConnectionData.mockResolvedValue(suppliers);

				// ACT
				await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

				// ASSERT
				expect(mockTracer.debug).toHaveBeenCalledTimes(2); // Initial + retrieved
				expect(mockTracer.warn).not.toHaveBeenCalled();
				expect(mockTracer.debug).toHaveBeenNthCalledWith(1, `🔮 [Reflection] Getting '${connectionType}' suppliers ...`);
				expect(mockTracer.debug).toHaveBeenNthCalledWith(
					2,
					`🔮 [Reflection] Retrieved 1 suppliers for connection type '${connectionType}'`,
				);
			});
		});
	});
});
