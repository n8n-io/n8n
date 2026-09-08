import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import { coerceArrayTypeFields, processAirtableError, removeIgnored } from '../../helpers/utils';
import { apiRequest, apiRequestAllItems, batchUpdate } from '../../transport';
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
        operation: ['upsert'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(items, base, table) {
    const returnData = [];
    const endpoint = `${base}/${table}`;
    const dataMode = this.getNodeParameter('columns.mappingMode', 0);
    const columnsToMatchOn = this.getNodeParameter('columns.matchingColumns', 0);
    for (let i = 0; i < items.length; i++) {
        try {
            const records = [];
            const options = this.getNodeParameter('options', i, {});
            if (dataMode === 'autoMapInputData') {
                if (columnsToMatchOn.includes('id')) {
                    const { id, ...fields } = items[i].json;
                    records.push({
                        id: id,
                        fields: removeIgnored(fields, options.ignoreFields),
                    });
                }
                else {
                    records.push({ fields: removeIgnored(items[i].json, options.ignoreFields) });
                }
            }
            if (dataMode === 'defineBelow') {
                const typecast = options.typecast ? true : false;
                const fields = this.getNodeParameter('columns.value', i, [], typecast ? { skipValidation: true } : undefined);
                if (typecast) {
                    coerceArrayTypeFields(fields, this.getNode().parameters.columns);
                }
                if (columnsToMatchOn.includes('id')) {
                    const id = fields.id;
                    delete fields.id;
                    records.push({ id, fields });
                }
                else {
                    records.push({ fields });
                }
            }
            const body = {
                typecast: options.typecast ? true : false,
            };
            if (!columnsToMatchOn.includes('id')) {
                body.performUpsert = { fieldsToMergeOn: columnsToMatchOn };
            }
            let responseData;
            try {
                responseData = await batchUpdate.call(this, endpoint, body, records);
            }
            catch (error) {
                if (error.httpCode === '422' && columnsToMatchOn.includes('id')) {
                    const createBody = {
                        ...body,
                        records: records.map(({ fields }) => ({ fields })),
                    };
                    responseData = await apiRequest.call(this, 'POST', endpoint, createBody);
                }
                else if (error?.description?.includes('Cannot update more than one record')) {
                    const conditions = columnsToMatchOn
                        .map((column) => `{${column}} = '${records[0].fields[column]}'`)
                        .join(',');
                    const response = await apiRequestAllItems.call(this, 'GET', endpoint, {}, {
                        fields: columnsToMatchOn,
                        filterByFormula: `AND(${conditions})`,
                    });
                    const matches = response.records;
                    const updateRecords = [];
                    if (options.updateAllMatches) {
                        updateRecords.push(...matches.map(({ id }) => ({ id, fields: records[0].fields })));
                    }
                    else {
                        updateRecords.push({ id: matches[0].id, fields: records[0].fields });
                    }
                    responseData = await batchUpdate.call(this, endpoint, body, updateRecords);
                }
                else {
                    throw error;
                }
            }
            const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData.records), { itemData: { item: i } });
            returnData.push(...executionData);
        }
        catch (error) {
            error = processAirtableError(error, undefined, i);
            if (this.continueOnFail()) {
                returnData.push({ json: { message: error.message, error } });
                continue;
            }
            throw error;
        }
    }
    return returnData;
}
//# sourceMappingURL=upsert.operation.js.map