import type { IExecuteFunctions } from 'n8n-workflow';

import { execute } from '../../../actions/row/get.operation';
import type { FieldEntry } from '../../../common/constants';
import { ANY_FILTER } from '../../../common/constants';
import { DATA_TABLE_ID_FIELD } from '../../../common/fields';

describe('Data Table get Operation', () => {
	let mockExecuteFunctions: IExecuteFunctions;
	const getManyRowsAndCount = jest.fn();
	const dataTableId = 2345;
	let filters: FieldEntry[];

	beforeEach(() => {
		filters = [
			{
				condition: 'eq',
				keyName: 'id',
				keyValue: 1,
			},
		];
		mockExecuteFunctions = {
			getNode: jest.fn().mockReturnValue({}),
			getInputData: jest.fn().mockReturnValue([{}]),
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
			helpers: {
				getDataStoreProxy: jest.fn().mockReturnValue({
					getManyRowsAndCount,
				}),
			},
		} as unknown as IExecuteFunctions;

		jest.clearAllMocks();
	});

	describe('execute', () => {
		it('should get a few rows', async () => {
			// ARRANGE
			getManyRowsAndCount.mockReturnValue({ data: [{ id: 1 }], count: 1 });

			// ACT
			const result = await execute.call(mockExecuteFunctions, 0);

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
			const result = await execute.call(mockExecuteFunctions, 0);

			// ASSERT
			expect(result.length).toBe(2345);
			expect(result[0]).toEqual({ json: { id: 0 } });
			expect(result[2344]).toEqual({ json: { id: 2344 } });
		});
		it('should pass null through correctly', async () => {
			// ARRANGE
			getManyRowsAndCount.mockReturnValue({ data: [{ id: 1, colA: null }], count: 1 });

			// ACT
			const result = await execute.call(mockExecuteFunctions, 0);

			// ASSERT
			expect(result).toEqual([{ json: { id: 1, colA: null } }]);
		});
	});
});
