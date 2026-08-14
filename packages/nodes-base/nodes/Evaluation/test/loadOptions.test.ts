/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */
import { type ILoadOptionsFunctions } from 'n8n-workflow';

import { getSheetHeaderRow } from '../../Google/Sheet/v2/methods/loadOptions';
import { getSheetHeaderRowWithGeneratedColumnNames } from '../methods/loadOptions';
import type { Mock } from 'vitest';

vi.mock('../../Google/Sheet/v2/methods/loadOptions', () => ({
	getSheetHeaderRow: vi.fn(),
}));

describe('getSheetHeaderRowWithGeneratedColumnNames', () => {
	let mockThis: ILoadOptionsFunctions;

	beforeEach(() => {
		mockThis = {
			getNodeParameter: vi.fn(),
			getCredentials: vi.fn(),
		} as unknown as ILoadOptionsFunctions;

		vi.clearAllMocks();
	});

	it('should return column names as-is if they are not empty', async () => {
		(getSheetHeaderRow as Mock).mockResolvedValue([
			{ name: 'Column1', value: 'Column1' },
			{ name: 'Column2', value: 'Column2' },
		]);

		const result = await getSheetHeaderRowWithGeneratedColumnNames.call(mockThis);

		expect(getSheetHeaderRow).toHaveBeenCalled();
		expect(result).toEqual([
			{ name: 'Column1', value: 'Column1' },
			{ name: 'Column2', value: 'Column2' },
		]);
	});

	it('should generate column names for empty values', async () => {
		(getSheetHeaderRow as Mock).mockResolvedValue([
			{ name: '', value: '' },
			{ name: 'Column2', value: 'Column2' },
			{ name: '', value: '' },
		]);

		const result = await getSheetHeaderRowWithGeneratedColumnNames.call(mockThis);

		expect(getSheetHeaderRow).toHaveBeenCalled();
		expect(result).toEqual([
			{ name: 'col_1', value: 'col_1' },
			{ name: 'Column2', value: 'Column2' },
			{ name: 'col_3', value: 'col_3' },
		]);
	});

	it('should handle an empty header row gracefully', async () => {
		(getSheetHeaderRow as Mock).mockResolvedValue([]);

		const result = await getSheetHeaderRowWithGeneratedColumnNames.call(mockThis);

		expect(getSheetHeaderRow).toHaveBeenCalled();
		expect(result).toEqual([]);
	});
});
