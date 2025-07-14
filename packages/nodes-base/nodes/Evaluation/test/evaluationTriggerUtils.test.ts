import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { readSheet } from '../../Google/Sheet/v2/actions/utils/readOperation';
import { GoogleSheet } from '../../Google/Sheet/v2/helpers/GoogleSheet';
import { getFilteredResults } from '../utils/evaluationTriggerUtils';

jest.mock('../../Google/Sheet/v2/actions/utils/readOperation', () => ({
	readSheet: jest.fn(),
}));

describe('getFilteredResults', () => {
	let mockThis: IExecuteFunctions;
	let mockGoogleSheet: GoogleSheet;

	beforeEach(() => {
		// Mock the `this` context
		mockThis = {
			getNode: jest.fn().mockReturnValue({ typeVersion: 1 }),
		} as unknown as IExecuteFunctions;

		// Mock the GoogleSheet instance
		mockGoogleSheet = new GoogleSheet('mockSpreadsheetId', mockThis);

		// Reset mocks before each test
		jest.clearAllMocks();
	});

	it('should return filtered results based on endingRow', async () => {
		// Arrange
		const mockOperationResult: INodeExecutionData[] = [];
		const mockResult = { title: 'Sheet1', sheetId: 1 };
		const startingRow = 1;
		const endingRow = 3;

		(readSheet as jest.Mock).mockResolvedValue([
			{ json: { row_number: 1, data: 'Row 1' } },
			{ json: { row_number: 2, data: 'Row 2' } },
			{ json: { row_number: 3, data: 'Row 3' } },
			{ json: { row_number: 4, data: 'Row 4' } },
		]);

		// Act
		const result = await getFilteredResults.call(
			mockThis,
			mockOperationResult,
			mockGoogleSheet,
			mockResult,
			startingRow,
			endingRow,
		);

		// Assert
		expect(readSheet).toHaveBeenCalledWith(
			mockGoogleSheet,
			'Sheet1',
			0,
			mockOperationResult,
			1,
			[],
			undefined,
			{
				rangeDefinition: 'specifyRange',
				headerRow: 1,
				firstDataRow: startingRow,
				includeHeadersWithEmptyCells: true,
			},
		);

		expect(result).toEqual([
			{ json: { row_number: 1, data: 'Row 1' } },
			{ json: { row_number: 2, data: 'Row 2' } },
			{ json: { row_number: 3, data: 'Row 3' } },
		]);
	});

	it('should return an empty array if no rows match the filter', async () => {
		// Arrange
		const mockOperationResult: INodeExecutionData[] = [];
		const mockResult = { title: 'Sheet1', sheetId: 1 };
		const startingRow = 1;
		const endingRow = 0;

		(readSheet as jest.Mock).mockResolvedValue([
			{ json: { row_number: 1, data: 'Row 1' } },
			{ json: { row_number: 2, data: 'Row 2' } },
		]);

		// Act
		const result = await getFilteredResults.call(
			mockThis,
			mockOperationResult,
			mockGoogleSheet,
			mockResult,
			startingRow,
			endingRow,
		);

		// Assert
		expect(readSheet).toHaveBeenCalled();
		expect(result).toEqual([]);
	});
});
