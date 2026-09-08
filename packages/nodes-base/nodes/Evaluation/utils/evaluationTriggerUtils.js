import { readSheet } from '../../Google/Sheet/v2/actions/utils/readOperation';
import { GoogleSheet } from '../../Google/Sheet/v2/helpers/GoogleSheet';
import { getSpreadsheetId } from '../../Google/Sheet/v2/helpers/GoogleSheets.utils';
export async function getSheet(googleSheet) {
    const sheetWithinDocument = this.getNodeParameter('sheetName', 0, undefined, {
        extractValue: true,
    });
    const { mode: sheetMode } = this.getNodeParameter('sheetName', 0);
    return await googleSheet.spreadsheetGetSheet(this.getNode(), sheetMode, sheetWithinDocument);
}
export function getGoogleSheet() {
    const { mode, value } = this.getNodeParameter('documentId', 0);
    const spreadsheetId = getSpreadsheetId(this.getNode(), mode, value);
    const googleSheet = new GoogleSheet(spreadsheetId, this);
    return googleSheet;
}
export async function getFilteredResults(operationResult, googleSheet, result, startingRow, endingRow) {
    const sheetName = result.title;
    operationResult = await readSheet.call(this, googleSheet, sheetName, 0, operationResult, this.getNode().typeVersion, [], undefined, {
        rangeDefinition: 'specifyRange',
        headerRow: 1,
        firstDataRow: startingRow,
        includeHeadersWithEmptyCells: true,
    });
    return operationResult.filter((row) => row?.json?.row_number <= endingRow);
}
export async function getNumberOfRowsLeftFiltered(googleSheet, sheetName, startingRow, endingRow) {
    const remainderSheet = await readSheet.call(this, googleSheet, sheetName, 0, [], this.getNode().typeVersion, [], undefined, {
        rangeDefinition: 'specifyRange',
        headerRow: 1,
        firstDataRow: startingRow,
    });
    return remainderSheet.filter((row) => row?.json?.row_number <= endingRow).length;
}
export async function getResults(operationResult, googleSheet, result, rangeOptions) {
    const sheetName = result.title;
    operationResult = await readSheet.call(this, googleSheet, sheetName, 0, operationResult, this.getNode().typeVersion, [], undefined, { ...rangeOptions, includeHeadersWithEmptyCells: true });
    return operationResult;
}
export async function getRowsLeft(googleSheet, sheetName, rangeString) {
    const remainderSheet = await readSheet.call(this, googleSheet, sheetName, 0, [], this.getNode().typeVersion, [], rangeString);
    return remainderSheet.length;
}
//# sourceMappingURL=evaluationTriggerUtils.js.map