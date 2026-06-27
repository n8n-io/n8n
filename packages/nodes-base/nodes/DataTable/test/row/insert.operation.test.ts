import type { IDataTableProjectService, IExecuteFunctions, INode } from 'n8n-workflow';

import { router } from '../../actions/router';
import { DATA_TABLE_ID_FIELD } from '../../common/fields';
import type { Mock } from 'vitest';

describe('DataTable Insert Operation - datetime output', () => {
	const testDate = new Date('2025-12-11T10:30:59.000Z');
	const testUpdatedDate = new Date('2025-12-12T11:16:53.385Z');
	const insertedRow = {
		id: 1,
		name: 'hello_world',
		newDate: testDate,
		createdAt: testDate,
		updatedAt: testUpdatedDate,
	};

	let mockExecuteFunctions: IExecuteFunctions;
	let insertRows: Mock;

	function createMockExecuteFunctions(typeVersion: number): IExecuteFunctions {
		insertRows = vi.fn().mockResolvedValue([insertedRow]);

		const mockDataTableProxy = {
			insertRows,
		} as unknown as IDataTableProjectService;

		return {
			getNode: vi.fn().mockReturnValue({ id: 'test', typeVersion } as INode),
			getNodeParameter: vi.fn().mockImplementation((param, _index, defaultVal, options?) => {
				if (param === 'resource') return 'row';
				if (param === 'operation') return 'insert';
				if (param === DATA_TABLE_ID_FIELD) return { mode: 'id', value: 'table123' };
				if (param === `${DATA_TABLE_ID_FIELD}.value` && options?.rawExpressions) {
					return 'table123';
				}
				if (param === 'options.optimizeBulk') return false;
				if (param === 'columns.mappingMode') return 'defineBelow';
				if (param === 'columns.value') return { name: 'hello_world' };
				return defaultVal;
			}),
			getInputData: vi.fn().mockReturnValue([{ json: {} }]),
			helpers: {
				getDataTableProxy: vi.fn().mockResolvedValue(mockDataTableProxy),
				constructExecutionMetaData: vi.fn((data) => data),
			},
		} as unknown as IExecuteFunctions;
	}

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should convert Date objects to ISO strings in output via bulk insert path (v1.1+)', async () => {
		mockExecuteFunctions = createMockExecuteFunctions(1.1);

		const [result] = await router.call(mockExecuteFunctions);

		expect(insertRows).toHaveBeenCalled();
		expect(result).toEqual([
			{
				json: {
					id: 1,
					name: 'hello_world',
					newDate: '2025-12-11T10:30:59.000Z',
					createdAt: '2025-12-11T10:30:59.000Z',
					updatedAt: '2025-12-12T11:16:53.385Z',
				},
				pairedItem: { item: 0 },
			},
		]);
	});

	it('should keep Date objects in output (v1.0 - legacy behavior)', async () => {
		mockExecuteFunctions = createMockExecuteFunctions(1);

		const [result] = await router.call(mockExecuteFunctions);

		expect(result[0].json.createdAt).toBeInstanceOf(Date);
		expect(result[0].json.updatedAt).toBeInstanceOf(Date);
		expect((result[0].json.createdAt as Date).toISOString()).toBe('2025-12-11T10:30:59.000Z');
	});

	it('should convert dates via per-item insert path when table ID is an expression', async () => {
		mockExecuteFunctions = createMockExecuteFunctions(1.1);
		(mockExecuteFunctions.getNodeParameter as Mock).mockImplementation(
			(param, _index, defaultVal, options?) => {
				if (param === 'resource') return 'row';
				if (param === 'operation') return 'insert';
				if (param === DATA_TABLE_ID_FIELD) return { mode: 'id', value: '={{ $json.tableId }}' };
				if (param === `${DATA_TABLE_ID_FIELD}.value` && options?.rawExpressions) {
					return '={{ $json.tableId }}';
				}
				if (param === 'options.optimizeBulk') return false;
				if (param === 'columns.mappingMode') return 'defineBelow';
				if (param === 'columns.value') return { name: 'hello_world' };
				return defaultVal;
			},
		);

		const [result] = await router.call(mockExecuteFunctions);

		expect(result[0].json).toEqual({
			id: 1,
			name: 'hello_world',
			newDate: '2025-12-11T10:30:59.000Z',
			createdAt: '2025-12-11T10:30:59.000Z',
			updatedAt: '2025-12-12T11:16:53.385Z',
		});
	});
});
