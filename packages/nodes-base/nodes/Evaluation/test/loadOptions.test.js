import { getSheetHeaderRow } from '../../Google/Sheet/v2/methods/loadOptions';
import { getSheetHeaderRowWithGeneratedColumnNames } from '../methods/loadOptions';
vi.mock('../../Google/Sheet/v2/methods/loadOptions', () => ({
    getSheetHeaderRow: vi.fn(),
}));
describe('getSheetHeaderRowWithGeneratedColumnNames', () => {
    let mockThis;
    beforeEach(() => {
        mockThis = {
            getNodeParameter: vi.fn(),
            getCredentials: vi.fn(),
        };
        vi.clearAllMocks();
    });
    it('should return column names as-is if they are not empty', async () => {
        getSheetHeaderRow.mockResolvedValue([
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
        getSheetHeaderRow.mockResolvedValue([
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
        getSheetHeaderRow.mockResolvedValue([]);
        const result = await getSheetHeaderRowWithGeneratedColumnNames.call(mockThis);
        expect(getSheetHeaderRow).toHaveBeenCalled();
        expect(result).toEqual([]);
    });
});
//# sourceMappingURL=loadOptions.test.js.map