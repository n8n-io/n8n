import { getSheetHeaderRow } from '../../Google/Sheet/v2/methods/loadOptions';
export { getConditionsForColumn, getDataTableColumns } from '../../DataTable/common/methods';
export async function getSheetHeaderRowWithGeneratedColumnNames() {
    const returnData = await getSheetHeaderRow.call(this);
    return returnData.map((column, i) => {
        if (column.value !== '')
            return column;
        const indexBasedValue = `col_${i + 1}`;
        return {
            name: indexBasedValue,
            value: indexBasedValue,
        };
    });
}
//# sourceMappingURL=loadOptions.js.map