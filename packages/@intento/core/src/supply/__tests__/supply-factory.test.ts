import type { IntentoConnectionType } from 'n8n-workflow';

import type { IFunctions } from 'types/*';

import type { Tracer } from '../../tracing/tracer';
import { SupplyFactory } from '../supply-factory';

/**
 * Tests for SupplyFactory
 * @author Claude Sonnet 4.5
 * @date 2026-01-06
 */

interface TestSupplier {
	id: string;
	name: string;
	type: string;
}

// Helper to create mock Tracer that satisfies type checker
function createMockTracer(): Tracer {
	return {
		debug: jest.fn(),
		warn: jest.fn(),
		info: jest.fn(),
		error: jest.fn(),
		bugDetected: jest.fn(),
	} as unknown as Tracer;
}

// Helper to create mock IFunctions that satisfies type checker
function createMockFunctions(mockGetInputConnectionData: jest.Mock): IFunctions {
	return {
		getInputConnectionData: mockGetInputConnectionData,
	} as unknown as IFunctions;
}

describe('SupplyFactory', () => {
	let mockFunctions: IFunctions;
	let mockTracer: Tracer;
	let mockGetInputConnectionData: jest.Mock;
	const connectionType = 'intento-translation' as IntentoConnectionType;

	beforeEach(() => {
		mockGetInputConnectionData = jest.fn();
		// Use helper function to create properly typed mock
		mockFunctions = createMockFunctions(mockGetInputConnectionData) as never as IFunctions;

		mockTracer = createMockTracer() as never as Tracer;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('getSuppliers', () => {
		describe('multiple suppliers (array)', () => {
			it('[BL-01] should retrieve multiple suppliers as reversed array', async () => {
				// ARRANGE
				const suppliers: TestSupplier[] = [
					{ id: 'sup-1', name: 'First', type: 'translation' },
					{ id: 'sup-2', name: 'Second', type: 'translation' },
					{ id: 'sup-3', name: 'Third', type: 'translation' },
				];
				mockGetInputConnectionData.mockResolvedValue(suppliers);

				// ACT
				const result = await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

				// ASSERT
				expect(result).toHaveLength(3);
				expect(result[0]).toEqual(suppliers[2]); // Last becomes first
				expect(result[1]).toEqual(suppliers[1]); // Middle stays middle
				expect(result[2]).toEqual(suppliers[0]); // First becomes last
			});

			it('[EC-01] should handle empty array (length 0)', async () => {
				// ARRANGE
				mockGetInputConnectionData.mockResolvedValue([]);

				// ACT
				const result = await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

				// ASSERT
				expect(result).toEqual([]);
				expect(result).toHaveLength(0);
			});

			it('[EC-02] should handle single-element array', async () => {
				// ARRANGE
				const supplier: TestSupplier = { id: 'sup-1', name: 'Only', type: 'translation' };
				mockGetInputConnectionData.mockResolvedValue([supplier]);

				// ACT
				const result = await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

				// ASSERT
				expect(result).toHaveLength(1);
				expect(result[0]).toEqual(supplier);
			});

			it('[EC-03] should reverse array with 2 elements correctly', async () => {
				// ARRANGE
				const supplierA: TestSupplier = { id: 'sup-a', name: 'A', type: 'translation' };
				const supplierB: TestSupplier = { id: 'sup-b', name: 'B', type: 'translation' };
				mockGetInputConnectionData.mockResolvedValue([supplierA, supplierB]);

				// ACT
				const result = await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

				// ASSERT
				expect(result).toHaveLength(2);
				expect(result[0]).toEqual(supplierB);
				expect(result[1]).toEqual(supplierA);
			});

			it('[EC-04] should reverse array with 3+ elements correctly', async () => {
				// ARRANGE
				const suppliers: TestSupplier[] = [
					{ id: 'sup-1', name: 'First', type: 'translation' },
					{ id: 'sup-2', name: 'Second', type: 'translation' },
					{ id: 'sup-3', name: 'Third', type: 'translation' },
					{ id: 'sup-4', name: 'Fourth', type: 'translation' },
				];
				mockGetInputConnectionData.mockResolvedValue(suppliers);

				// ACT
				const result = await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

				// ASSERT
				expect(result).toHaveLength(4);
				expect(result[0].id).toBe('sup-4');
				expect(result[1].id).toBe('sup-3');
				expect(result[2].id).toBe('sup-2');
				expect(result[3].id).toBe('sup-1');
			});

			it('[EC-08] should preserve supplier object properties after reversal', async () => {
				// ARRANGE
				const suppliers: TestSupplier[] = [
					{ id: 'sup-1', name: 'First', type: 'translation' },
					{ id: 'sup-2', name: 'Second', type: 'ai-model' },
				];
				mockGetInputConnectionData.mockResolvedValue(suppliers);

				// ACT
				const result = await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

				// ASSERT
				expect(result[0]).toHaveProperty('id', 'sup-2');
				expect(result[0]).toHaveProperty('name', 'Second');
				expect(result[0]).toHaveProperty('type', 'ai-model');
				expect(result[1]).toHaveProperty('id', 'sup-1');
				expect(result[1]).toHaveProperty('name', 'First');
				expect(result[1]).toHaveProperty('type', 'translation');
			});
		});

		describe('single supplier (object)', () => {
			it('[BL-02] should wrap single supplier in array', async () => {
				// ARRANGE
				const supplier: TestSupplier = {
					id: 'sup-single',
					name: 'Single Supplier',
					type: 'translation',
				};
				mockGetInputConnectionData.mockResolvedValue(supplier);

				// ACT
				const result = await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

				// ASSERT
				expect(Array.isArray(result)).toBe(true);
				expect(result).toHaveLength(1);
				expect(result[0]).toEqual(supplier);
			});

			it('[BL-07] should log debug for single supplier result', async () => {
				// ARRANGE
				const supplier: TestSupplier = { id: 'sup-1', name: 'Only', type: 'translation' };
				mockGetInputConnectionData.mockResolvedValue(supplier);

				// ACT
				await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

				// ASSERT
				expect(mockTracer.debug).toHaveBeenCalledWith("🔮 [Reflection] Retrieved 1 supplier for connection type 'intento-translation'");
			});
		});

		describe('no suppliers (empty)', () => {
			it('[BL-03] should return empty array when no suppliers found', async () => {
				// ARRANGE
				mockGetInputConnectionData.mockResolvedValue(null);

				// ACT
				const result = await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

				// ASSERT
				expect(result).toEqual([]);
				expect(result).toHaveLength(0);
			});

			it('[EC-05] should handle null result as empty', async () => {
				// ARRANGE
				mockGetInputConnectionData.mockResolvedValue(null);

				// ACT
				const result = await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

				// ASSERT
				expect(result).toEqual([]);
			});

			it('[EC-06] should handle undefined result as empty', async () => {
				// ARRANGE
				mockGetInputConnectionData.mockResolvedValue(undefined);

				// ACT
				const result = await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

				// ASSERT
				expect(result).toEqual([]);
			});

			it('[BL-08] should log warning when no suppliers found', async () => {
				// ARRANGE
				mockGetInputConnectionData.mockResolvedValue(null);

				// ACT
				await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

				// ASSERT
				expect(mockTracer.warn).toHaveBeenCalledWith("🔮 [Reflection] No suppliers found for connection type 'intento-translation'");
			});
		});

		describe('logging', () => {
			it('[BL-05] should log debug message when starting retrieval', async () => {
				// ARRANGE
				mockGetInputConnectionData.mockResolvedValue([]);

				// ACT
				await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

				// ASSERT
				expect(mockTracer.debug).toHaveBeenCalledWith("🔮 [Reflection] Getting 'intento-translation' suppliers ...");
			});

			it('[BL-06] should log debug with supplier count for array result', async () => {
				// ARRANGE
				const suppliers: TestSupplier[] = [
					{ id: 'sup-1', name: 'First', type: 'translation' },
					{ id: 'sup-2', name: 'Second', type: 'translation' },
					{ id: 'sup-3', name: 'Third', type: 'translation' },
				];
				mockGetInputConnectionData.mockResolvedValue(suppliers);

				// ACT
				await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

				// ASSERT
				expect(mockTracer.debug).toHaveBeenCalledWith("🔮 [Reflection] Retrieved 3 suppliers for connection type 'intento-translation'");
			});

			it('should log correct count for different array sizes', async () => {
				// ARRANGE
				const suppliers: TestSupplier[] = Array.from({ length: 5 }, (_, i) => ({
					id: `sup-${i}`,
					name: `Supplier ${i}`,
					type: 'translation',
				}));
				mockGetInputConnectionData.mockResolvedValue(suppliers);

				// ACT
				await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

				// ASSERT
				expect(mockTracer.debug).toHaveBeenCalledWith("🔮 [Reflection] Retrieved 5 suppliers for connection type 'intento-translation'");
			});
		});

		describe('API integration', () => {
			it('[BL-04] should call getInputConnectionData with correct parameters', async () => {
				// ARRANGE
				mockGetInputConnectionData.mockResolvedValue([]);

				// ACT
				await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

				// ASSERT
				expect(mockGetInputConnectionData).toHaveBeenCalledWith(connectionType, 0);
			});

			it('[BL-09] should cast connectionType to AINodeConnectionType', async () => {
				// ARRANGE
				mockGetInputConnectionData.mockResolvedValue([]);

				// ACT
				await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

				// ASSERT
				expect(mockGetInputConnectionData).toHaveBeenCalledWith('intento-translation', 0);
			});

			it('[EC-07] should handle different connection types', async () => {
				// ARRANGE
				const connectionTypes = [
					'intento-translation' as IntentoConnectionType,
					'ai-model' as IntentoConnectionType,
					'custom-supplier' as IntentoConnectionType,
				];
				mockGetInputConnectionData.mockResolvedValue([]);

				// ACT & ASSERT
				for (const type of connectionTypes) {
					await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, type, mockTracer);

					expect(mockTracer.debug).toHaveBeenCalledWith(expect.stringContaining(`Getting '${type}' suppliers`));
				}
			});
		});

		describe('type handling', () => {
			it('[BL-10] should apply generic type T to returned suppliers', async () => {
				// ARRANGE
				interface CustomSupplier {
					customId: number;
					customName: string;
				}
				const customSuppliers: CustomSupplier[] = [
					{ customId: 1, customName: 'Custom A' },
					{ customId: 2, customName: 'Custom B' },
				];
				mockGetInputConnectionData.mockResolvedValue(customSuppliers);

				// ACT
				const result = await SupplyFactory.getSuppliers<CustomSupplier>(mockFunctions, connectionType, mockTracer);

				// ASSERT
				expect(result).toHaveLength(2);
				expect(result[0]).toHaveProperty('customId', 2);
				expect(result[0]).toHaveProperty('customName', 'Custom B');
				expect(result[1]).toHaveProperty('customId', 1);
				expect(result[1]).toHaveProperty('customName', 'Custom A');
			});

			it('[EC-09] should handle supplier objects with complex types', async () => {
				// ARRANGE
				interface ComplexSupplier {
					id: string;
					config: {
						apiKey: string;
						endpoint: string;
					};
					metadata: {
						version: number;
						features: string[];
					};
				}
				const complexSupplier: ComplexSupplier = {
					id: 'complex-1',
					config: {
						apiKey: 'key-123',
						endpoint: 'https://api.example.com',
					},
					metadata: {
						version: 2,
						features: ['translation', 'summarization'],
					},
				};
				mockGetInputConnectionData.mockResolvedValue(complexSupplier);

				// ACT
				const result = await SupplyFactory.getSuppliers<ComplexSupplier>(mockFunctions, connectionType, mockTracer);

				// ASSERT
				expect(result).toHaveLength(1);
				expect(result[0].id).toBe('complex-1');
				expect(result[0].config.apiKey).toBe('key-123');
				expect(result[0].metadata.version).toBe(2);
				expect(result[0].metadata.features).toContain('translation');
			});
		});

		describe('integration scenarios', () => {
			it('[INT-01] should retrieve translation suppliers in reverse order', async () => {
				// ARRANGE
				const translationSuppliers = [
					{ id: 'openai', name: 'OpenAI', type: 'translation' },
					{ id: 'deepl', name: 'DeepL', type: 'translation' },
					{ id: 'google', name: 'Google Translate', type: 'translation' },
				];
				mockGetInputConnectionData.mockResolvedValue(translationSuppliers);

				// ACT
				const result = await SupplyFactory.getSuppliers<TestSupplier>(
					mockFunctions,
					'intento-translation' as IntentoConnectionType,
					mockTracer,
				);

				// ASSERT
				expect(result[0].id).toBe('google'); // Last connected, tried first
				expect(result[1].id).toBe('deepl');
				expect(result[2].id).toBe('openai'); // First connected, tried last
				expect(mockTracer.debug).toHaveBeenCalledWith("🔮 [Reflection] Retrieved 3 suppliers for connection type 'intento-translation'");
			});

			it('[INT-02] should retrieve AI model suppliers with proper logging', async () => {
				// ARRANGE
				const aiModels = [
					{ id: 'gpt-4', name: 'GPT-4', type: 'ai-model' },
					{ id: 'claude', name: 'Claude', type: 'ai-model' },
				];
				mockGetInputConnectionData.mockResolvedValue(aiModels);

				// ACT
				const result = await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, 'ai-model' as IntentoConnectionType, mockTracer);

				// ASSERT
				expect(result).toHaveLength(2);
				expect(result[0].id).toBe('claude');
				expect(result[1].id).toBe('gpt-4');
				expect(mockTracer.debug).toHaveBeenCalledWith("🔮 [Reflection] Getting 'ai-model' suppliers ...");
				expect(mockTracer.debug).toHaveBeenCalledWith("🔮 [Reflection] Retrieved 2 suppliers for connection type 'ai-model'");
			});

			it('[INT-03] should handle workflow with no connected suppliers gracefully', async () => {
				// ARRANGE
				mockGetInputConnectionData.mockResolvedValue(undefined);

				// ACT
				const result = await SupplyFactory.getSuppliers<TestSupplier>(mockFunctions, connectionType, mockTracer);

				// ASSERT
				expect(result).toEqual([]);
				expect(mockTracer.debug).toHaveBeenCalledWith("🔮 [Reflection] Getting 'intento-translation' suppliers ...");
				expect(mockTracer.warn).toHaveBeenCalledWith("🔮 [Reflection] No suppliers found for connection type 'intento-translation'");
			});
		});
	});
});
