import type { IDataTableProjectService, IExecuteFunctions, INode } from 'n8n-workflow';

import { router } from '../../actions/router';
import { ANY_CONDITION } from '../../common/constants';
import { DATA_TABLE_ID_FIELD } from '../../common/fields';
import type { Mock } from 'vitest';

describe('DataTable Update Operation - datetime output', () => {
	const testDate = new Date('2025-12-11T10:30:59.000Z');
	const testUpdatedDate = new Date('2025-12-12T11:16:53.385Z');
	const updatedRow = {
		id: 1,
		name: 'hello_world',
		newDate: testDate,
		createdAt: testDate,
		updatedAt: testUpdatedDate,
	};

	let mockExecuteFunctions: IExecuteFunctions;
	let updateRows: Mock;

	function createMockExecuteFunctions(typeVersion: number): IExecuteFunctions {
		updateRows = vi.fn().mockResolvedValue([updatedRow]);

		const mockDataTableProxy = {
			updateRows,
			getColumns: vi.fn().mockResolvedValue([
				{ name: 'name', type: 'string' },
				{ name: 'newDate', type: 'date' },
			]),
		} as unknown as IDataTableProjectService;

		return {
			getNode: vi.fn().mockReturnValue({ id: 'test', typeVersion } as INode),
			getNodeParameter: vi.fn().mockImplementation((param, _index, defaultVal) => {
				if (param === 'resource') return 'row';
				if (param === 'operation') return 'update';
				if (param === DATA_TABLE_ID_FIELD) return { mode: 'id', value: 'table123' };
				if (param === 'options.dryRun') return false;
				if (param === 'columns.mappingMode') return 'defineBelow';
				if (param === 'columns.value') return { name: 'hello_world' };
				if (param === 'filters.conditions') {
					return [{ keyName: 'id', condition: 'eq', keyValue: '1' }];
				}
				if (param === 'matchType') return ANY_CONDITION;
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

	it('should convert Date objects to ISO strings in output (v1.1+)', async () => {
		mockExecuteFunctions = createMockExecuteFunctions(1.1);

		const [result] = await router.call(mockExecuteFunctions);

		expect(updateRows).toHaveBeenCalled();
		expect(result).toEqual([
			{
				json: {
					id: 1,
					name: 'hello_world',
					newDate: '2025-12-11T10:30:59.000Z',
					createdAt: '2025-12-11T10:30:59.000Z',
					updatedAt: '2025-12-12T11:16:53.385Z',
				},
			},
		]);
	});

	it('should keep Date objects in output (v1.0 - legacy behavior)', async () => {
		mockExecuteFunctions = createMockExecuteFunctions(1);

		const [result] = await router.call(mockExecuteFunctions);

		expect(result[0].json.createdAt).toBeInstanceOf(Date);
		expect(result[0].json.updatedAt).toBeInstanceOf(Date);
	});
});
