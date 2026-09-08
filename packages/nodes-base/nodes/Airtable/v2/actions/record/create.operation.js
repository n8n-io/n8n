import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import { coerceArrayTypeFields, processAirtableError, removeIgnored } from '../../helpers/utils';
import { apiRequest } from '../../transport';
import { insertUpdateOptions } from '../common.descriptions';
const properties = [
    {
        displayName: 'Columns',
        name: 'columns',
        type: 'resourceMapper',
        default: {
            mappingMode: 'defineBelow',
            value: null,
        },
        noDataExpression: true,
        required: true,
        typeOptions: {
            loadOptionsDependsOn: ['table.value', 'base.value'],
            resourceMapper: {
                resourceMapperMethod: 'getColumns',
                mode: 'add',
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
        operation: ['create'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(items, base, table) {
    const returnData = [];
    const endpoint = `${base}/${table}`;
    const dataMode = this.getNodeParameter('columns.mappingMode', 0);
    for (let i = 0; i < items.length; i++) {
        try {
            const options = this.getNodeParameter('options', i, {});
            const typecast = Boolean(options.typecast);
            const body = { typecast };
            if (dataMode === 'autoMapInputData') {
                body.fields = removeIgnored(items[i].json, options.ignoreFields);
            }
            if (dataMode === 'defineBelow') {
                const fields = this.getNodeParameter('columns.value', i, [], {
                    skipValidation: typecast,
                });
                if (typecast) {
                    coerceArrayTypeFields(fields, this.getNode().parameters.columns);
                }
                body.fields = fields;
            }
            const responseData = await apiRequest.call(this, 'POST', endpoint, body);
            const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), { itemData: { item: i } });
            returnData.push.apply(returnData, executionData);
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
//# sourceMappingURL=create.operation.js.map