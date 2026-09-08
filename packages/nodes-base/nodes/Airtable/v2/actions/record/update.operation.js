import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import { coerceArrayTypeFields, findMatches, processAirtableError, removeIgnored, } from '../../helpers/utils';
import { apiRequestAllItems, batchUpdate } from '../../transport';
import { insertUpdateOptions } from '../common.descriptions';
const properties = [
    {
        displayName: 'Columns',
        name: 'columns',
        type: 'resourceMapper',
        noDataExpression: true,
        default: {
            mappingMode: 'defineBelow',
            value: null,
        },
        required: true,
        typeOptions: {
            loadOptionsDependsOn: ['table.value', 'base.value'],
            resourceMapper: {
                resourceMapperMethod: 'getColumnsWithRecordId',
                mode: 'update',
                fieldWords: {
                    singular: 'column',
                    plural: 'columns',
                },
                addAllFields: true,
                multiKeyMatch: true,
            },
        },
    },
    ...insertUpdateOptions,
];
const displayOptions = {
    show: {
        resource: ['record'],
        operation: ['update'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(items, base, table) {
    const returnData = [];
    const endpoint = `${base}/${table}`;
    const dataMode = this.getNodeParameter('columns.mappingMode', 0);
    const columnsToMatchOn = this.getNodeParameter('columns.matchingColumns', 0);
    let tableData = [];
    if (!columnsToMatchOn.includes('id')) {
        const response = await apiRequestAllItems.call(this, 'GET', endpoint, {}, { fields: columnsToMatchOn });
        tableData = response.records;
    }
    for (let i = 0; i < items.length; i++) {
        let recordId = '';
        try {
            const records = [];
            const options = this.getNodeParameter('options', i, {});
            const typecast = options.typecast ? true : false;
            if (dataMode === 'autoMapInputData') {
                if (columnsToMatchOn.includes('id')) {
                    const { id, ...fields } = items[i].json;
                    recordId = id;
                    records.push({
                        id: recordId,
                        fields: removeIgnored(fields, options.ignoreFields),
                    });
                }
                else {
                    const matches = findMatches(tableData, columnsToMatchOn, items[i].json, options.updateAllMatches);
                    for (const match of matches) {
                        const id = match.id;
                        const fields = items[i].json;
                        records.push({ id, fields: removeIgnored(fields, options.ignoreFields) });
                    }
                }
            }
            if (dataMode === 'defineBelow') {
                const getNodeParameterOptions = typecast ? { skipValidation: true } : undefined;
                if (columnsToMatchOn.includes('id')) {
                    const { id, ...fields } = this.getNodeParameter('columns.value', i, [], getNodeParameterOptions);
                    if (typecast) {
                        coerceArrayTypeFields(fields, this.getNode().parameters.columns);
                    }
                    records.push({ id: id, fields });
                }
                else {
                    const fields = this.getNodeParameter('columns.value', i, [], getNodeParameterOptions);
                    if (typecast) {
                        coerceArrayTypeFields(fields, this.getNode().parameters.columns);
                    }
                    const matches = findMatches(tableData, columnsToMatchOn, fields, options.updateAllMatches);
                    for (const match of matches) {
                        const id = match.id;
                        records.push({ id, fields: removeIgnored(fields, columnsToMatchOn) });
                    }
                }
            }
            const body = { typecast };
            const responseData = await batchUpdate.call(this, endpoint, body, records);
            const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData.records), { itemData: { item: i } });
            returnData.push(...executionData);
        }
        catch (error) {
            error = processAirtableError(error, recordId, i);
            if (this.continueOnFail()) {
                returnData.push({ json: { message: error.message, error } });
                continue;
            }
            throw error;
        }
    }
    return returnData;
}
//# sourceMappingURL=update.operation.js.map