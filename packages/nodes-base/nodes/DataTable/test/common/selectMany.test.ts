import {
	type INode,
	NodeOperationError,
	type IDataStoreProjectService,
	type IExecuteFunctions,
} from 'n8n-workflow';

import type { FieldEntry } from '../../common/constants';
import { ANY_FILTER } from '../../common/constants';
import { DATA_TABLE_ID_FIELD } from '../../common/fields';
import { executeSelectMany } from '../../common/selectMany';

describe('selectMany utils', () => {
	let mockExecuteFunctions: IExecuteFunctions;
	const getManyRowsAndCount = jest.fn();
	const dataStoreProxy = jest.mocked<IDataStoreProjectService>({
		getManyRowsAndCount,
	} as unknown as IDataStoreProjectService);
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
		mockExecuteFunctions = {
			getNode: jest.fn().mockReturnValue(node),
			getNodeParameter: jest.fn().mockImplementation((field) => {
				switch (field) {
					case DATA_TABLE_ID_FIELD:
						return dataTableId;
					case 'filters.conditions':
						return filters;
					case 'matchType':
						return ANY_FILTER;
				}
			}),
		} as unknown as IExecuteFunctions;

		jest.clearAllMocks();
	});

	describe('executeSelectMany', () => {
		it('should get a few rows', async () => {
			// ARRANGE
			getManyRowsAndCount.mockReturnValue({ data: [{ id: 1 }], count: 1 });

			// ACT
			const result = await executeSelectMany(mockExecuteFunctions, 0, dataStoreProxy);

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
			const result = await executeSelectMany(mockExecuteFunctions, 0, dataStoreProxy);

			// ASSERT
			expect(result.length).toBe(2345);
			expect(result[0]).toEqual({ json: { id: 0 } });
			expect(result[2344]).toEqual({ json: { id: 2344 } });
		});
		it('should pass null through correctly', async () => {
			// ARRANGE
			getManyRowsAndCount.mockReturnValue({ data: [{ id: 1, colA: null }], count: 1 });

			// ACT
			const result = await executeSelectMany(mockExecuteFunctions, 0, dataStoreProxy);

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
			await expect(executeSelectMany(mockExecuteFunctions, 0, dataStoreProxy)).rejects.toEqual(
				new NodeOperationError(
					node,
					'synchronization error: result count changed during pagination',
				),
			);
		});
	});
});
