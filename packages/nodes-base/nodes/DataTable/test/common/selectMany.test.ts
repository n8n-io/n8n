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
	const getManyRowsAndCount = vi.fn();
	const dataTableProxy = vi.mocked<IDataTableProjectService>({
		getManyRowsAndCount,
	} as unknown as IDataTableProjectService);
	const dataTableId = 2345;
	let filters: FieldEntry[];
	let returnAll: boolean;
	let rowLimit: number;
	const node = { id: 1 } as unknown as INode;

	beforeEach(() => {
		getManyRowsAndCount.mockReset();
		returnAll = true;
		rowLimit = 50;
		filters = [
			{
				condition: 'eq',
				keyName: 'id',
				keyValue: 1,
			},
		];

		const mockDataTableProxy = {
			getColumns: vi.fn().mockResolvedValue([
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
				{ name: 'status', type: 'string' },
			]),
		};

		mockExecuteFunctions = {
			getNode: vi.fn().mockReturnValue(node),
			getExecutionCancelSignal: vi.fn().mockReturnValue(undefined),
			getNodeParameter: vi.fn().mockImplementation((field) => {
				switch (field) {
					case DATA_TABLE_ID_FIELD:
						return dataTableId;
					case 'filters.conditions':
						return filters;
					case 'matchType':
						return ANY_CONDITION;
					case 'returnAll':
						return returnAll;
					case 'limit':
						return rowLimit;
				}
			}),
			helpers: {
				getDataTableProxy: vi.fn().mockResolvedValue(mockDataTableProxy),
			},
		} as unknown as IExecuteFunctions;

		vi.clearAllMocks();
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

		it.each([2344, 2346])(
			'should continue when the matching count changes from 2345 to %i',
			async (count) => {
				filters = [{ condition: 'eq', keyName: 'status', keyValue: 'active' }];
				const rows = Array.from({ length: count }, (_, id) => ({ id, status: 'active' }));
				getManyRowsAndCount
					.mockResolvedValueOnce({ data: rows.slice(0, 1000), count: 2345 })
					.mockResolvedValueOnce({ data: rows.slice(1000, 2000), count })
					.mockResolvedValueOnce({ data: rows.slice(2000), count });

				const result = await executeSelectMany(mockExecuteFunctions, 0, dataTableProxy);

				expect(result).toEqual(rows.map((json) => ({ json })));
				expect(getManyRowsAndCount).toHaveBeenCalledTimes(3);
				const filter = {
					type: 'or',
					filters: [{ columnName: 'status', condition: 'eq', value: 'active' }],
				};
				expect(getManyRowsAndCount).toHaveBeenNthCalledWith(
					1,
					expect.objectContaining({ skip: 0, take: 1000, filter }),
				);
				expect(getManyRowsAndCount).toHaveBeenNthCalledWith(
					2,
					expect.objectContaining({ skip: 1000, take: 1000, filter }),
				);
				expect(getManyRowsAndCount).toHaveBeenNthCalledWith(
					3,
					expect.objectContaining({ skip: 2000, take: count - 2000, filter }),
				);
			},
		);

		it('should finish when repeated count increases stop', async () => {
			const rows = Array.from({ length: 1003 }, (_, id) => ({ id }));
			getManyRowsAndCount
				.mockRejectedValue(new Error('Unexpected additional page'))
				.mockResolvedValueOnce({ data: rows.slice(0, 1000), count: 1001 })
				.mockResolvedValueOnce({ data: rows.slice(1000, 1001), count: 1002 })
				.mockResolvedValueOnce({ data: rows.slice(1001, 1002), count: 1003 })
				.mockResolvedValueOnce({ data: rows.slice(1002), count: 1003 });
			filters = [];

			const result = await executeSelectMany(mockExecuteFunctions, 0, dataTableProxy);

			expect(result).toEqual(rows.map((json) => ({ json })));
			expect(getManyRowsAndCount).toHaveBeenCalledTimes(4);
			for (const [index, skip] of [0, 1000, 1001, 1002].entries()) {
				expect(getManyRowsAndCount).toHaveBeenNthCalledWith(
					index + 1,
					expect.objectContaining({ skip, take: index === 0 ? 1000 : 1 }),
				);
			}
		});

		it('should stop requesting pages after cancellation while the count keeps increasing', async () => {
			const controller = new AbortController();
			vi.mocked(mockExecuteFunctions.getExecutionCancelSignal).mockReturnValue(controller.signal);
			const rows = Array.from({ length: 1002 }, (_, id) => ({ id }));
			getManyRowsAndCount
				.mockRejectedValue(new Error('Unexpected additional page'))
				.mockResolvedValueOnce({ data: rows.slice(0, 1000), count: 1001 })
				.mockResolvedValueOnce({ data: rows.slice(1000, 1001), count: 1002 })
				.mockImplementationOnce(async () => {
					controller.abort();
					return { data: rows.slice(1001), count: 1003 };
				});
			filters = [];

			const result = await executeSelectMany(mockExecuteFunctions, 0, dataTableProxy);

			expect(result).toEqual(rows.map((json) => ({ json })));
			expect(getManyRowsAndCount).toHaveBeenCalledTimes(3);
		});

		it('should not request rows when execution is already cancelled', async () => {
			const controller = new AbortController();
			controller.abort();
			vi.mocked(mockExecuteFunctions.getExecutionCancelSignal).mockReturnValue(controller.signal);
			getManyRowsAndCount.mockRejectedValue(new Error('Unexpected page request'));
			filters = [];

			const result = await executeSelectMany(mockExecuteFunctions, 0, dataTableProxy);

			expect(result).toEqual([]);
			expect(getManyRowsAndCount).not.toHaveBeenCalled();
		});

		it('should stop when the count falls below the number of collected rows', async () => {
			const rows = Array.from({ length: 2000 }, (_, id) => ({ id }));
			getManyRowsAndCount
				.mockRejectedValue(new Error('Unexpected additional page'))
				.mockResolvedValueOnce({ data: rows.slice(0, 1000), count: 2345 })
				.mockResolvedValueOnce({ data: rows.slice(1000), count: 1500 });
			filters = [];

			const result = await executeSelectMany(mockExecuteFunctions, 0, dataTableProxy);

			expect(result).toEqual(rows.map((json) => ({ json })));
			expect(getManyRowsAndCount).toHaveBeenCalledTimes(2);
		});

		it('should continue when a short first page reports more matching rows', async () => {
			const rows = [{ id: 1 }, { id: 2 }, { id: 3 }];
			getManyRowsAndCount
				.mockRejectedValue(new Error('Unexpected additional page'))
				.mockResolvedValueOnce({ data: rows.slice(0, 2), count: 3 })
				.mockResolvedValueOnce({ data: rows.slice(2), count: 3 });
			filters = [];

			const result = await executeSelectMany(mockExecuteFunctions, 0, dataTableProxy);

			expect(result).toEqual(rows.map((json) => ({ json })));
			expect(getManyRowsAndCount).toHaveBeenCalledTimes(2);
			expect(getManyRowsAndCount).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({ skip: 2, take: 1 }),
			);
		});

		it('should return a nonempty final page when the count decreases', async () => {
			const rows = Array.from({ length: 1499 }, (_, id) => ({ id }));
			getManyRowsAndCount
				.mockResolvedValueOnce({ data: rows.slice(0, 1000), count: 1500 })
				.mockResolvedValueOnce({ data: rows.slice(1000), count: 1499 });
			filters = [];

			const result = await executeSelectMany(mockExecuteFunctions, 0, dataTableProxy);

			expect(result).toEqual(rows.map((json) => ({ json })));
			expect(getManyRowsAndCount).toHaveBeenCalledTimes(2);
			expect(getManyRowsAndCount).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({ skip: 1000, take: 500 }),
			);
		});

		it.each([1000, 1001])(
			'should return the collected rows when an empty page reports a count of %i',
			async (count) => {
				const rows = Array.from({ length: 1000 }, (_, id) => ({ id }));
				getManyRowsAndCount
					.mockRejectedValue(new Error('Unexpected additional page'))
					.mockResolvedValueOnce({ data: rows, count: 1001 })
					.mockResolvedValueOnce({ data: [], count });
				filters = [];

				const result = await executeSelectMany(mockExecuteFunctions, 0, dataTableProxy);

				expect(result).toEqual(rows.map((json) => ({ json })));
				expect(getManyRowsAndCount).toHaveBeenCalledTimes(2);
				expect(getManyRowsAndCount).toHaveBeenNthCalledWith(
					2,
					expect.objectContaining({ skip: 1000, take: 1 }),
				);
			},
		);

		it('should stop when the first page is empty but its count is positive', async () => {
			getManyRowsAndCount
				.mockRejectedValue(new Error('Unexpected additional page'))
				.mockResolvedValueOnce({ data: [], count: 1 });
			filters = [];

			const result = await executeSelectMany(mockExecuteFunctions, 0, dataTableProxy);

			expect(result).toEqual([]);
			expect(getManyRowsAndCount).toHaveBeenCalledTimes(1);
		});

		it('should respect the configured limit when the count changes', async () => {
			returnAll = false;
			rowLimit = 1500;
			const rows = Array.from({ length: 1500 }, (_, id) => ({ id }));
			getManyRowsAndCount
				.mockResolvedValueOnce({ data: rows.slice(0, 1000), count: 2345 })
				.mockResolvedValueOnce({ data: rows.slice(1000), count: 2346 });
			filters = [];

			const result = await executeSelectMany(mockExecuteFunctions, 0, dataTableProxy);

			expect(result).toEqual(rows.map((json) => ({ json })));
			expect(getManyRowsAndCount).toHaveBeenCalledTimes(2);
			expect(getManyRowsAndCount).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({ skip: 1000, take: 500 }),
			);
		});

		it('should respect an explicit limit of one when returnAll is enabled', async () => {
			getManyRowsAndCount.mockResolvedValueOnce({ data: [{ id: 1 }], count: 2345 });
			filters = [];

			const result = await executeSelectMany(mockExecuteFunctions, 0, dataTableProxy, false, 1);

			expect(result).toEqual([{ json: { id: 1 } }]);
			expect(getManyRowsAndCount).toHaveBeenCalledTimes(1);
			expect(getManyRowsAndCount).toHaveBeenCalledWith(
				expect.objectContaining({ skip: 0, take: 1 }),
			);
		});

		it.each([1000, 2000])(
			'should finish a stable read of %i rows without an extra request',
			async (count) => {
				const rows = Array.from({ length: count }, (_, id) => ({ id }));
				getManyRowsAndCount
					.mockRejectedValue(new Error('Unexpected additional page'))
					.mockResolvedValueOnce({ data: rows.slice(0, 1000), count });
				if (count > 1000) {
					getManyRowsAndCount.mockResolvedValueOnce({ data: rows.slice(1000), count });
				}
				filters = [];

				const result = await executeSelectMany(mockExecuteFunctions, 0, dataTableProxy);

				expect(result).toEqual(rows.map((json) => ({ json })));
				expect(getManyRowsAndCount).toHaveBeenCalledTimes(count / 1000);
			},
		);

		it('should propagate a database error from a later page', async () => {
			const error = new Error('Database connection failed');
			getManyRowsAndCount.mockReturnValueOnce({
				data: Array.from({ length: 1000 }, (_, k) => ({ id: k })),
				count: 2345,
			});
			getManyRowsAndCount.mockRejectedValueOnce(error);
			filters = [];

			await expect(executeSelectMany(mockExecuteFunctions, 0, dataTableProxy)).rejects.toBe(error);
			expect(getManyRowsAndCount).toHaveBeenCalledTimes(2);
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
				mockExecuteFunctions.getNodeParameter = vi.fn().mockImplementation((field) => {
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
				mockExecuteFunctions.getNodeParameter = vi.fn().mockImplementation((field) => {
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
				mockExecuteFunctions.getNodeParameter = vi.fn().mockImplementation((field) => {
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

			it('should convert Date objects to ISO strings in output (v1.1+)', async () => {
				// ARRANGE
				const testDate = new Date('2025-12-11T10:30:59.000Z');
				const testUpdatedDate = new Date('2025-12-12T11:16:53.385Z');
				filters = [];
				mockExecuteFunctions.getNodeParameter = vi.fn().mockImplementation((field) => {
					switch (field) {
						case DATA_TABLE_ID_FIELD:
							return dataTableId;
						case 'filters.conditions':
							return filters;
						case 'matchType':
							return ANY_CONDITION;
						case 'returnAll':
							return true;
					}
				});
				mockExecuteFunctions.getNode = vi.fn().mockReturnValue({ ...node, typeVersion: 1.1 });
				getManyRowsAndCount.mockReturnValue({
					data: [
						{
							id: 1,
							completedDate: testDate,
							createdAt: testDate,
							updatedAt: testUpdatedDate,
							status: 'active',
						},
					],
					count: 1,
				});

				// ACT
				const result = await executeSelectMany(mockExecuteFunctions, 0, dataTableProxy);

				// ASSERT
				// Dates should be converted to ISO strings, not Date objects
				expect(result).toEqual([
					{
						json: {
							id: 1,
							completedDate: '2025-12-11T10:30:59.000Z',
							createdAt: '2025-12-11T10:30:59.000Z',
							updatedAt: '2025-12-12T11:16:53.385Z',
							status: 'active',
						},
					},
				]);
			});

			it('should keep Date objects in output (v1.0 - legacy behavior)', async () => {
				// ARRANGE
				const testDate = new Date('2025-12-11T10:30:59.000Z');
				const testUpdatedDate = new Date('2025-12-12T11:16:53.385Z');
				filters = [];
				mockExecuteFunctions.getNodeParameter = vi.fn().mockImplementation((field) => {
					switch (field) {
						case DATA_TABLE_ID_FIELD:
							return dataTableId;
						case 'filters.conditions':
							return filters;
						case 'matchType':
							return ANY_CONDITION;
						case 'returnAll':
							return true;
					}
				});
				mockExecuteFunctions.getNode = vi.fn().mockReturnValue({ ...node, typeVersion: 1 });
				getManyRowsAndCount.mockReturnValue({
					data: [
						{
							id: 1,
							completedDate: testDate,
							createdAt: testDate,
							updatedAt: testUpdatedDate,
							status: 'active',
						},
					],
					count: 1,
				});

				// ACT
				const result = await executeSelectMany(mockExecuteFunctions, 0, dataTableProxy);

				// ASSERT
				expect(result).toEqual([
					{
						json: {
							id: 1,
							completedDate: testDate,
							createdAt: testDate,
							updatedAt: testUpdatedDate,
							status: 'active',
						},
					},
				]);
			});
		});

		describe('sorting', () => {
			it('should pass sortBy parameter to getManyRowsAndCount with ASC direction', async () => {
				// ARRANGE
				filters = [];
				const sortBy: [string, 'ASC' | 'DESC'] = ['name', 'ASC'];
				getManyRowsAndCount.mockReturnValue({
					data: [
						{ id: 1, name: 'Alice' },
						{ id: 2, name: 'Bob' },
					],
					count: 2,
				});

				// ACT
				await executeSelectMany(mockExecuteFunctions, 0, dataTableProxy, false, undefined, sortBy);

				// ASSERT
				expect(getManyRowsAndCount).toHaveBeenCalledWith(
					expect.objectContaining({
						sortBy: ['name', 'ASC'],
					}),
				);
			});

			it('should pass sortBy parameter to getManyRowsAndCount with DESC direction', async () => {
				// ARRANGE
				filters = [];
				const sortBy: [string, 'ASC' | 'DESC'] = ['id', 'DESC'];
				getManyRowsAndCount.mockReturnValue({
					data: [
						{ id: 3, name: 'Charlie' },
						{ id: 2, name: 'Bob' },
						{ id: 1, name: 'Alice' },
					],
					count: 3,
				});

				// ACT
				await executeSelectMany(mockExecuteFunctions, 0, dataTableProxy, false, undefined, sortBy);

				// ASSERT
				expect(getManyRowsAndCount).toHaveBeenCalledWith(
					expect.objectContaining({
						sortBy: ['id', 'DESC'],
					}),
				);
			});

			it('should work with undefined sortBy', async () => {
				// ARRANGE
				filters = [];
				getManyRowsAndCount.mockReturnValue({
					data: [{ id: 1, name: 'Alice' }],
					count: 1,
				});

				// ACT
				await executeSelectMany(
					mockExecuteFunctions,
					0,
					dataTableProxy,
					false,
					undefined,
					undefined,
				);

				// ASSERT
				expect(getManyRowsAndCount).toHaveBeenCalledWith(
					expect.objectContaining({
						sortBy: undefined,
					}),
				);
			});

			it('should combine sortBy with filter conditions', async () => {
				// ARRANGE
				filters = [{ condition: 'eq', keyName: 'status', keyValue: 'active' }];
				const sortBy: [string, 'ASC' | 'DESC'] = ['name', 'ASC'];
				getManyRowsAndCount.mockReturnValue({
					data: [
						{ id: 1, name: 'Alice', status: 'active' },
						{ id: 2, name: 'Bob', status: 'active' },
					],
					count: 2,
				});

				// ACT
				await executeSelectMany(mockExecuteFunctions, 0, dataTableProxy, false, undefined, sortBy);

				// ASSERT
				expect(getManyRowsAndCount).toHaveBeenCalledWith(
					expect.objectContaining({
						sortBy: ['name', 'ASC'],
						filter: expect.objectContaining({
							type: 'or',
							filters: [
								{
									columnName: 'status',
									condition: 'eq',
									value: 'active',
								},
							],
						}),
					}),
				);
			});

			it('should maintain sortBy across paginated requests', async () => {
				// ARRANGE
				filters = [];
				const sortBy: [string, 'ASC' | 'DESC'] = ['id', 'ASC'];
				getManyRowsAndCount.mockReturnValueOnce({
					data: Array.from({ length: 1000 }, (_, k) => ({ id: k })),
					count: 1500,
				});
				getManyRowsAndCount.mockReturnValueOnce({
					data: Array.from({ length: 500 }, (_, k) => ({ id: k + 1000 })),
					count: 1500,
				});

				// ACT
				await executeSelectMany(mockExecuteFunctions, 0, dataTableProxy, false, undefined, sortBy);

				// ASSERT
				expect(getManyRowsAndCount).toHaveBeenNthCalledWith(
					1,
					expect.objectContaining({
						sortBy: ['id', 'ASC'],
					}),
				);
				expect(getManyRowsAndCount).toHaveBeenNthCalledWith(
					2,
					expect.objectContaining({
						sortBy: ['id', 'ASC'],
					}),
				);
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
			const execution = getSelectFilter(mockExecuteFunctions, 0);
			await expect(execution).rejects.toThrow(NodeOperationError);
			await expect(execution).rejects.toThrow(
				'Filter validation failed: Column(s) "invalid_column" do not exist in the selected table. ' +
					'This often happens when switching between tables with different schemas. ' +
					'Please update your filter conditions.',
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
			const execution = getSelectFilter(mockExecuteFunctions, 0);
			await expect(execution).rejects.toThrow(NodeOperationError);
			await expect(execution).rejects.toThrow(
				'Filter validation failed: Column(s) "invalid1, invalid2" do not exist in the selected table. ' +
					'This often happens when switching between tables with different schemas. ' +
					'Please update your filter conditions.',
			);
		});
	});
});
