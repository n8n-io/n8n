import type { IDataTableProjectService, IExecuteFunctions, INode } from 'n8n-workflow';

import { ANY_CONDITION } from '../../common/constants';
import { DATA_TABLE_ID_FIELD } from '../../common/fields';
import * as getOperation from '../../actions/row/get.operation';

describe('DataTable Get Operation - Sort Feature', () => {
	let mockExecuteFunctions: IExecuteFunctions;
	let mockDataTableProxy: IDataTableProjectService;
	const node = { id: 'test', typeVersion: 1.1 } as INode;

	beforeEach(() => {
		const getManyRowsAndCount = jest.fn();
		const getColumns = jest.fn();

		mockDataTableProxy = {
			getManyRowsAndCount,
			getColumns,
		} as unknown as IDataTableProjectService;

		getColumns.mockResolvedValue([
			{ name: 'id', type: 'number' },
			{ name: 'name', type: 'string' },
			{ name: 'age', type: 'number' },
			{ name: 'status', type: 'string' },
		]);

		mockExecuteFunctions = {
			getNode: jest.fn().mockReturnValue(node),
			getNodeParameter: jest.fn(),
			helpers: {
				getDataTableProxy: jest.fn().mockResolvedValue(mockDataTableProxy),
			},
		} as unknown as IExecuteFunctions;

		jest.clearAllMocks();
	});

	describe('Single Column Sort', () => {
		it('should sort by column ascending', async () => {
			// ARRANGE
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation((param) => {
				if (param === DATA_TABLE_ID_FIELD) return { mode: 'id', value: 'table123' };
				if (param === 'orderBy') return true;
				if (param === 'orderByColumn') return 'name';
				if (param === 'orderByDirection') return 'ASC';
				if (param === 'returnAll') return false;
				if (param === 'limit') return 10;
				if (param === 'filters.conditions') return [];
				if (param === 'matchType') return ANY_CONDITION;
				return undefined;
			});

			(mockDataTableProxy.getManyRowsAndCount as jest.Mock).mockResolvedValue({
				data: [
					{ id: 1, name: 'Alice' },
					{ id: 2, name: 'Bob' },
				],
				count: 2,
			});

			// ACT
			await getOperation.execute.call(mockExecuteFunctions, 0);

			// ASSERT
			expect(mockDataTableProxy.getManyRowsAndCount).toHaveBeenCalledWith(
				expect.objectContaining({
					sortBy: ['name', 'ASC'],
				}),
			);
		});

		it('should sort by column descending', async () => {
			// ARRANGE
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation((param) => {
				if (param === DATA_TABLE_ID_FIELD) return { mode: 'id', value: 'table123' };
				if (param === 'orderBy') return true;
				if (param === 'orderByColumn') return 'age';
				if (param === 'orderByDirection') return 'DESC';
				if (param === 'returnAll') return false;
				if (param === 'limit') return 10;
				if (param === 'filters.conditions') return [];
				if (param === 'matchType') return ANY_CONDITION;
				return undefined;
			});

			(mockDataTableProxy.getManyRowsAndCount as jest.Mock).mockResolvedValue({
				data: [
					{ id: 2, age: 30 },
					{ id: 1, age: 25 },
				],
				count: 2,
			});

			// ACT
			await getOperation.execute.call(mockExecuteFunctions, 0);

			// ASSERT
			expect(mockDataTableProxy.getManyRowsAndCount).toHaveBeenCalledWith(
				expect.objectContaining({
					sortBy: ['age', 'DESC'],
				}),
			);
		});

		it('should sort by id column', async () => {
			// ARRANGE
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation((param) => {
				if (param === DATA_TABLE_ID_FIELD) return { mode: 'id', value: 'table123' };
				if (param === 'orderBy') return true;
				if (param === 'orderByColumn') return 'id';
				if (param === 'orderByDirection') return 'ASC';
				if (param === 'returnAll') return true;
				if (param === 'filters.conditions') return [];
				if (param === 'matchType') return ANY_CONDITION;
				return undefined;
			});

			(mockDataTableProxy.getManyRowsAndCount as jest.Mock).mockResolvedValue({
				data: [
					{ id: 1, name: 'Alice' },
					{ id: 2, name: 'Bob' },
					{ id: 3, name: 'Charlie' },
				],
				count: 3,
			});

			// ACT
			await getOperation.execute.call(mockExecuteFunctions, 0);

			// ASSERT
			expect(mockDataTableProxy.getManyRowsAndCount).toHaveBeenCalledWith(
				expect.objectContaining({
					sortBy: ['id', 'ASC'],
				}),
			);
		});
	});

	describe('No Sort Rule', () => {
		it('should work without sort rule (orderBy false)', async () => {
			// ARRANGE
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation((param) => {
				if (param === DATA_TABLE_ID_FIELD) return { mode: 'id', value: 'table123' };
				if (param === 'orderBy') return false;
				if (param === 'returnAll') return false;
				if (param === 'limit') return 10;
				if (param === 'filters.conditions') return [];
				if (param === 'matchType') return ANY_CONDITION;
				return undefined;
			});

			(mockDataTableProxy.getManyRowsAndCount as jest.Mock).mockResolvedValue({
				data: [{ id: 1 }],
				count: 1,
			});

			// ACT
			await getOperation.execute.call(mockExecuteFunctions, 0);

			// ASSERT
			expect(mockDataTableProxy.getManyRowsAndCount).toHaveBeenCalledWith(
				expect.objectContaining({
					sortBy: undefined,
				}),
			);
		});

		it('should work with v1.0 (legacy version)', async () => {
			// ARRANGE
			const v10Node = { id: 'test', typeVersion: 1.0 } as INode;
			(mockExecuteFunctions.getNode as jest.Mock).mockReturnValue(v10Node);

			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation((param) => {
				if (param === DATA_TABLE_ID_FIELD) return { mode: 'id', value: 'table123' };
				if (param === 'orderBy') return false;
				if (param === 'returnAll') return false;
				if (param === 'limit') return 10;
				if (param === 'filters.conditions') return [];
				if (param === 'matchType') return ANY_CONDITION;
				return undefined;
			});

			(mockDataTableProxy.getManyRowsAndCount as jest.Mock).mockResolvedValue({
				data: [{ id: 1 }],
				count: 1,
			});

			// ACT
			await getOperation.execute.call(mockExecuteFunctions, 0);

			// ASSERT
			expect(mockDataTableProxy.getManyRowsAndCount).toHaveBeenCalledWith(
				expect.objectContaining({
					sortBy: undefined,
				}),
			);
		});
	});

	describe('Sort with Filters', () => {
		it('should combine sort and filters correctly', async () => {
			// ARRANGE
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation((param) => {
				if (param === DATA_TABLE_ID_FIELD) return { mode: 'id', value: 'table123' };
				if (param === 'orderBy') return true;
				if (param === 'orderByColumn') return 'name';
				if (param === 'orderByDirection') return 'ASC';
				if (param === 'returnAll') return false;
				if (param === 'limit') return 10;
				if (param === 'filters.conditions') {
					return [{ keyName: 'status', condition: 'eq', keyValue: 'active' }];
				}
				if (param === 'matchType') return ANY_CONDITION;
				return undefined;
			});

			(mockDataTableProxy.getManyRowsAndCount as jest.Mock).mockResolvedValue({
				data: [
					{ id: 1, name: 'Alice', status: 'active' },
					{ id: 2, name: 'Bob', status: 'active' },
				],
				count: 2,
			});

			// ACT
			await getOperation.execute.call(mockExecuteFunctions, 0);

			// ASSERT
			expect(mockDataTableProxy.getManyRowsAndCount).toHaveBeenCalledWith(
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
	});

	describe('Sort with Pagination', () => {
		it('should maintain sort order with returnAll=true', async () => {
			// ARRANGE
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation((param) => {
				if (param === DATA_TABLE_ID_FIELD) return { mode: 'id', value: 'table123' };
				if (param === 'orderBy') return true;
				if (param === 'orderByColumn') return 'id';
				if (param === 'orderByDirection') return 'DESC';
				if (param === 'returnAll') return true;
				if (param === 'filters.conditions') return [];
				if (param === 'matchType') return ANY_CONDITION;
				return undefined;
			});

			(mockDataTableProxy.getManyRowsAndCount as jest.Mock).mockResolvedValue({
				data: [{ id: 5 }, { id: 4 }, { id: 3 }],
				count: 3,
			});

			// ACT
			await getOperation.execute.call(mockExecuteFunctions, 0);

			// ASSERT
			expect(mockDataTableProxy.getManyRowsAndCount).toHaveBeenCalledWith(
				expect.objectContaining({
					sortBy: ['id', 'DESC'],
				}),
			);
		});

		it('should maintain sort order with limit', async () => {
			// ARRANGE
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation((param) => {
				if (param === DATA_TABLE_ID_FIELD) return { mode: 'id', value: 'table123' };
				if (param === 'orderBy') return true;
				if (param === 'orderByColumn') return 'name';
				if (param === 'orderByDirection') return 'ASC';
				if (param === 'returnAll') return false;
				if (param === 'limit') return 5;
				if (param === 'filters.conditions') return [];
				if (param === 'matchType') return ANY_CONDITION;
				return undefined;
			});

			(mockDataTableProxy.getManyRowsAndCount as jest.Mock).mockResolvedValue({
				data: [
					{ id: 1, name: 'Alice' },
					{ id: 2, name: 'Bob' },
					{ id: 3, name: 'Charlie' },
					{ id: 4, name: 'David' },
					{ id: 5, name: 'Eve' },
				],
				count: 10,
			});

			// ACT
			await getOperation.execute.call(mockExecuteFunctions, 0);

			// ASSERT
			expect(mockDataTableProxy.getManyRowsAndCount).toHaveBeenCalledWith(
				expect.objectContaining({
					sortBy: ['name', 'ASC'],
					take: 5,
				}),
			);
		});
	});
});
