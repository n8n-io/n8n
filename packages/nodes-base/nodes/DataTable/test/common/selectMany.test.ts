import {
	type INode,
	NodeOperationError,
	type IDataTableProjectService,
	type IExecuteFunctions,
} from 'n8n-workflow';

import type { FieldEntry } from '../../common/constants';
import { ANY_CONDITION, ALL_CONDITIONS } from '../../common/constants';
import { DATA_TABLE_ID_FIELD } from '../../common/fields';
import { executeSelectMany, getSelectFilter } from '../../common/selectMany';

describe('selectMany utils', () => {
	let mockExecuteFunctions: IExecuteFunctions;
	const getManyRowsAndCount = jest.fn();
	const dataTableProxy = jest.mocked<IDataTableProjectService>({
		getManyRowsAndCount,
	} as unknown as IDataTableProjectService);
	const dataTableId = 2345;
	let filters: FieldEntry[];
	const node = { id: 1 } as unknown as INode;

	beforeEach(() => {
		filters = [
			{
				condition: 'eq',
				keyName: 'id',
				keyValue: 1,
			},
		];

		const mockDataTableProxy = {
			getColumns: jest.fn().mockResolvedValue([
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
				{ name: 'status', type: 'string' },
			]),
		};

		mockExecuteFunctions = {
			getNode: jest.fn().mockReturnValue(node),
			getNodeParameter: jest.fn().mockImplementation((field) => {
				switch (field) {
					case DATA_TABLE_ID_FIELD:
						return dataTableId;
					case 'filters.conditions':
						return filters;
					case 'matchType':
						return ANY_CONDITION;
				}
			}),
			helpers: {
				getDataTableProxy: jest.fn().mockResolvedValue(mockDataTableProxy),
			},
		} as unknown as IExecuteFunctions;

		jest.clearAllMocks();
	});

	describe('executeSelectMany', () => {
		it('should get a few rows', async () => {
			// ARRANGE
			getManyRowsAndCount.mockReturnValue({ data: [{ id: 1 }], count: 1 });

			// ACT
			const result = await executeSelectMany(mockExecuteFunctions, 0, dataTableProxy);

			// ASSERT
			expect(result).toEqual([{ json: { id: 1 } }]);
		});

		it('should get a paginated amount of rows', async () => {
			// ARRANGE
			getManyRowsAndCount.mockReturnValueOnce({
				data: Array.from({ length: 1000 }, (_, k) => ({ id: k })),
				count: 2345,
			});
			getManyRowsAndCount.mockReturnValueOnce({
				data: Array.from({ length: 1000 }, (_, k) => ({ id: k + 1000 })),
				count: 2345,
			});

			getManyRowsAndCount.mockReturnValueOnce({
				data: Array.from({ length: 345 }, (_, k) => ({ id: k + 2000 })),
				count: 2345,
			});

			filters = [];

			// ACT
			const result = await executeSelectMany(mockExecuteFunctions, 0, dataTableProxy);

			// ASSERT
			expect(result.length).toBe(2345);
			expect(result[0]).toEqual({ json: { id: 0 } });
			expect(result[2344]).toEqual({ json: { id: 2344 } });
		});

		it('should pass null through correctly', async () => {
			// ARRANGE
			getManyRowsAndCount.mockReturnValue({ data: [{ id: 1, colA: null }], count: 1 });

			// ACT
			const result = await executeSelectMany(mockExecuteFunctions, 0, dataTableProxy);

			// ASSERT
			expect(result).toEqual([{ json: { id: 1, colA: null } }]);
		});

		it('should panic if pagination gets out of sync', async () => {
			// ARRANGE
			getManyRowsAndCount.mockReturnValueOnce({
				data: Array.from({ length: 1000 }, (_, k) => ({ id: k })),
				count: 2345,
			});
			getManyRowsAndCount.mockReturnValueOnce({
				data: Array.from({ length: 1000 }, (_, k) => ({ id: k + 1000 })),
				count: 2344,
			});

			filters = [];

			// ACT ASSERT
			await expect(executeSelectMany(mockExecuteFunctions, 0, dataTableProxy)).rejects.toEqual(
				new NodeOperationError(
					node,
					'synchronization error: result count changed during pagination',
				),
			);
		});

		describe('filter conditions', () => {
			it('should handle "eq" condition', async () => {
				// ARRANGE
				filters = [{ condition: 'eq', keyName: 'name', keyValue: 'John' }];
				getManyRowsAndCount.mockReturnValue({ data: [{ id: 1, name: 'John' }], count: 1 });

				// ACT
				const result = await executeSelectMany(mockExecuteFunctions, 0, dataTableProxy);

				// ASSERT
				expect(result).toEqual([{ json: { id: 1, name: 'John' } }]);
			});

			it('should handle "neq" condition', async () => {
				// ARRANGE
				filters = [{ condition: 'neq', keyName: 'name', keyValue: 'John' }];
				getManyRowsAndCount.mockReturnValue({ data: [{ id: 1, name: 'Jane' }], count: 1 });

				// ACT
				const result = await executeSelectMany(mockExecuteFunctions, 0, dataTableProxy);

				// ASSERT
				expect(result).toEqual([{ json: { id: 1, name: 'Jane' } }]);
			});

			it('should handle "gt" condition with numbers', async () => {
				// ARRANGE
				filters = [{ condition: 'gt', keyName: 'age', keyValue: 25 }];
				getManyRowsAndCount.mockReturnValue({ data: [{ id: 1, age: 30 }], count: 1 });

				// ACT
				const result = await executeSelectMany(mockExecuteFunctions, 0, dataTableProxy);

				// ASSERT
				expect(result).toEqual([{ json: { id: 1, age: 30 } }]);
			});

			it('should handle "gte" condition with numbers', async () => {
				// ARRANGE
				filters = [{ condition: 'gte', keyName: 'age', keyValue: 25 }];
				getManyRowsAndCount.mockReturnValue({
					data: [
						{ id: 1, age: 25 },
						{ id: 2, age: 30 },
					],
					count: 2,
				});

				// ACT
				const result = await executeSelectMany(mockExecuteFunctions, 0, dataTableProxy);

				// ASSERT
				expect(result).toEqual([{ json: { id: 1, age: 25 } }, { json: { id: 2, age: 30 } }]);
			});

			it('should handle "lt" condition with numbers', async () => {
				// ARRANGE
				filters = [{ condition: 'lt', keyName: 'age', keyValue: 30 }];
				getManyRowsAndCount.mockReturnValue({ data: [{ id: 1, age: 25 }], count: 1 });

				// ACT
				const result = await executeSelectMany(mockExecuteFunctions, 0, dataTableProxy);

				// ASSERT
				expect(result).toEqual([{ json: { id: 1, age: 25 } }]);
			});

			it('should handle "lte" condition with numbers', async () => {
				// ARRANGE
				filters = [{ condition: 'lte', keyName: 'age', keyValue: 30 }];
				getManyRowsAndCount.mockReturnValue({
					data: [
						{ id: 1, age: 25 },
						{ id: 2, age: 30 },
					],
					count: 2,
				});

				// ACT
				const result = await executeSelectMany(mockExecuteFunctions, 0, dataTableProxy);

				// ASSERT
				expect(result).toEqual([{ json: { id: 1, age: 25 } }, { json: { id: 2, age: 30 } }]);
			});

			it('should handle "like" condition with pattern matching', async () => {
				// ARRANGE
				filters = [{ condition: 'like', keyName: 'name', keyValue: '%Mar%' }];
				getManyRowsAndCount.mockReturnValue({ data: [{ id: 1, name: 'Anne-Marie' }], count: 1 });

				// ACT
				const result = await executeSelectMany(mockExecuteFunctions, 0, dataTableProxy);

				// ASSERT
				expect(result).toEqual([{ json: { id: 1, name: 'Anne-Marie' } }]);
			});

			it('should handle "ilike" condition with case-insensitive pattern matching', async () => {
				// ARRANGE
				filters = [{ condition: 'ilike', keyName: 'name', keyValue: '%mar%' }];
				getManyRowsAndCount.mockReturnValue({ data: [{ id: 1, name: 'Anne-Marie' }], count: 1 });

				// ACT
				const result = await executeSelectMany(mockExecuteFunctions, 0, dataTableProxy);

				// ASSERT
				expect(result).toEqual([{ json: { id: 1, name: 'Anne-Marie' } }]);
			});

			it('should handle multiple conditions with ANY_CONDITION (OR logic - matches records satisfying either condition)', async () => {
				// ARRANGE
				filters = [
					{ condition: 'eq', keyName: 'status', keyValue: 'active' },
					{ condition: 'gt', keyName: 'age', keyValue: 50 },
				];
				getManyRowsAndCount.mockReturnValue({
					data: [{ id: 1, status: 'active', age: 25 }],
					count: 1,
				});

				// ACT
				const result = await executeSelectMany(mockExecuteFunctions, 0, dataTableProxy);

				// ASSERT
				expect(result).toEqual([{ json: { id: 1, status: 'active', age: 25 } }]);
			});

			it('should handle multiple conditions with ALL_CONDITIONS (AND logic - matches records satisfying all conditions)', async () => {
				// ARRANGE
				filters = [
					{ condition: 'eq', keyName: 'status', keyValue: 'active' },
					{ condition: 'gte', keyName: 'age', keyValue: 21 },
				];
				mockExecuteFunctions.getNodeParameter = jest.fn().mockImplementation((field) => {
					switch (field) {
						case DATA_TABLE_ID_FIELD:
							return dataTableId;
						case 'filters.conditions':
							return filters;
						case 'matchType':
							return ALL_CONDITIONS;
					}
				});
				getManyRowsAndCount.mockReturnValue({
					data: [{ id: 1, status: 'active', age: 25 }],
					count: 1,
				});

				// ACT
				const result = await executeSelectMany(mockExecuteFunctions, 0, dataTableProxy);

				// ASSERT
				expect(result).toEqual([{ json: { id: 1, status: 'active', age: 25 } }]);
			});

			it('should handle ALL_CONDITIONS excluding records that match only one condition (proves AND logic)', async () => {
				// ARRANGE
				filters = [
					{ condition: 'eq', keyName: 'status', keyValue: 'inactive' },
					{ condition: 'gte', keyName: 'age', keyValue: 21 },
				];
				mockExecuteFunctions.getNodeParameter = jest.fn().mockImplementation((field) => {
					switch (field) {
						case DATA_TABLE_ID_FIELD:
							return dataTableId;
						case 'filters.conditions':
							return filters;
						case 'matchType':
							return ALL_CONDITIONS;
					}
				});
				getManyRowsAndCount.mockReturnValue({
					data: [],
					count: 0,
				});

				// ACT
				const result = await executeSelectMany(mockExecuteFunctions, 0, dataTableProxy);

				// ASSERT
				expect(result).toEqual([]);
			});

			it('should handle ANY_CONDITION including records that match only one condition (proves OR logic)', async () => {
				// ARRANGE
				filters = [
					{ condition: 'eq', keyName: 'status', keyValue: 'inactive' },
					{ condition: 'gte', keyName: 'age', keyValue: 21 },
				];
				mockExecuteFunctions.getNodeParameter = jest.fn().mockImplementation((field) => {
					switch (field) {
						case DATA_TABLE_ID_FIELD:
							return dataTableId;
						case 'filters.conditions':
							return filters;
						case 'matchType':
							return ANY_CONDITION;
					}
				});
				getManyRowsAndCount.mockReturnValue({
					data: [{ id: 1, status: 'active', age: 25 }],
					count: 1,
				});

				// ACT
				const result = await executeSelectMany(mockExecuteFunctions, 0, dataTableProxy);

				// ASSERT
				expect(result).toEqual([{ json: { id: 1, status: 'active', age: 25 } }]);
			});
		});
	});

	describe('getSelectFilter', () => {
		it('should validate filter conditions against table schema', async () => {
			// ARRANGE
			filters = [
				{ condition: 'eq', keyName: 'name', keyValue: 'John' }, // Valid column
				{ condition: 'eq', keyName: 'invalid_column', keyValue: 'test' }, // Invalid column
			];

			// ACT & ASSERT
			await expect(getSelectFilter(mockExecuteFunctions, 0)).rejects.toEqual(
				new NodeOperationError(
					node,
					'Filter validation failed: Column(s) "invalid_column" do not exist in the selected table. ' +
						'This often happens when switching between tables with different schemas. ' +
						'Please update your filter conditions.',
				),
			);
		});

		it('should allow system columns in filter conditions', async () => {
			// ARRANGE
			filters = [
				{ condition: 'eq', keyName: 'id', keyValue: 1 }, // System column
				{ condition: 'neq', keyName: 'createdAt', keyValue: null }, // System column
			];

			// ACT
			const result = await getSelectFilter(mockExecuteFunctions, 0);

			// ASSERT
			expect(result).toBeDefined();
			expect(result.filters).toHaveLength(2);
		});

		it('should allow combination of system and custom columns', async () => {
			// ARRANGE
			filters = [
				{ condition: 'eq', keyName: 'id', keyValue: 1 }, // System column
				{ condition: 'eq', keyName: 'name', keyValue: 'John' }, // Custom column
			];

			// ACT
			const result = await getSelectFilter(mockExecuteFunctions, 0);

			// ASSERT
			expect(result).toBeDefined();
			expect(result.filters).toHaveLength(2);
		});

		it('should pass validation when no filters are provided', async () => {
			// ARRANGE
			filters = [];

			// ACT
			const result = await getSelectFilter(mockExecuteFunctions, 0);

			// ASSERT
			expect(result).toBeDefined();
			expect(result.filters).toHaveLength(0);
		});

		it('should report multiple invalid columns in error message', async () => {
			// ARRANGE
			filters = [
				{ condition: 'eq', keyName: 'invalid1', keyValue: 'test1' },
				{ condition: 'eq', keyName: 'invalid2', keyValue: 'test2' },
			];

			// ACT & ASSERT
			await expect(getSelectFilter(mockExecuteFunctions, 0)).rejects.toEqual(
				new NodeOperationError(
					node,
					'Filter validation failed: Column(s) "invalid1, invalid2" do not exist in the selected table. ' +
						'This often happens when switching between tables with different schemas. ' +
						'Please update your filter conditions.',
				),
			);
		});
	});
});
