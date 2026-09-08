import { readSheet } from '../../Google/Sheet/v2/actions/utils/readOperation';
import { GoogleSheet } from '../../Google/Sheet/v2/helpers/GoogleSheet';
import { getFilteredResults } from '../utils/evaluationTriggerUtils';
vi.mock('../../Google/Sheet/v2/actions/utils/readOperation', () => ({
    readSheet: vi.fn(),
}));
describe('getFilteredResults', () => {
    let mockThis;
    let mockGoogleSheet;
    beforeEach(() => {
        // Mock the `this` context
        mockThis = {
            getNode: vi.fn().mockReturnValue({ typeVersion: 1 }),
        };
        // Mock the GoogleSheet instance
        mockGoogleSheet = new GoogleSheet('mockSpreadsheetId', mockThis);
        // Reset mocks before each test
        vi.clearAllMocks();
    });
    it('should return filtered results based on endingRow', async () => {
        // Arrange
        const mockOperationResult = [];
        const mockResult = { title: 'Sheet1', sheetId: 1 };
        const startingRow = 1;
        const endingRow = 3;
        readSheet.mockResolvedValue([
            { json: { row_number: 1, data: 'Row 1' } },
            { json: { row_number: 2, data: 'Row 2' } },
            { json: { row_number: 3, data: 'Row 3' } },
            { json: { row_number: 4, data: 'Row 4' } },
        ]);
        // Act
        const result = await getFilteredResults.call(mockThis, mockOperationResult, mockGoogleSheet, mockResult, startingRow, endingRow);
        // Assert
        expect(readSheet).toHaveBeenCalledWith(mockGoogleSheet, 'Sheet1', 0, mockOperationResult, 1, [], undefined, {
            rangeDefinition: 'specifyRange',
            headerRow: 1,
            firstDataRow: startingRow,
            includeHeadersWithEmptyCells: true,
        });
        expect(result).toEqual([
            { json: { row_number: 1, data: 'Row 1' } },
            { json: { row_number: 2, data: 'Row 2' } },
            { json: { row_number: 3, data: 'Row 3' } },
        ]);
    });
    it('should return an empty array if no rows match the filter', async () => {
        // Arrange
        const mockOperationResult = [];
        const mockResult = { title: 'Sheet1', sheetId: 1 };
        const startingRow = 1;
        const endingRow = 0;
        readSheet.mockResolvedValue([
            { json: { row_number: 1, data: 'Row 1' } },
            { json: { row_number: 2, data: 'Row 2' } },
        ]);
        // Act
        const result = await getFilteredResults.call(mockThis, mockOperationResult, mockGoogleSheet, mockResult, startingRow, endingRow);
        // Assert
        expect(readSheet).toHaveBeenCalled();
        expect(result).toEqual([]);
    });
});
//# sourceMappingURL=evaluationTriggerUtils.test.js.map