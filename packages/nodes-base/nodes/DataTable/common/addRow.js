import { DATA_TABLE_SYSTEM_COLUMNS, } from 'n8n-workflow';
import { DATA_TABLE_ID_FIELD } from './fields';
import { dataObjectToApiInput } from './utils';
export function makeAddRow(operation, displayOptions) {
    return {
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
            loadOptionsDependsOn: [`${DATA_TABLE_ID_FIELD}.value`],
            resourceMapper: {
                valuesLabel: `Values to ${operation}`,
                resourceMapperMethod: 'getDataTables',
                mode: 'add',
                fieldWords: {
                    singular: 'column',
                    plural: 'columns',
                },
                addAllFields: true,
                multiKeyMatch: true,
                hideNoDataError: true,
                refreshIncompleteSchemaOnOpen: true,
            },
        },
        displayOptions,
    };
}
export function getAddRow(ctx, index) {
    const items = ctx.getInputData();
    const dataMode = ctx.getNodeParameter('columns.mappingMode', index);
    let data;
    if (dataMode === 'autoMapInputData') {
        data = { ...items[index].json };
        // We automatically remove our system columns for better UX when feeding data table outputs
        // into another data table node
        for (const systemColumn of DATA_TABLE_SYSTEM_COLUMNS) {
            delete data[systemColumn];
        }
    }
    else {
        const fields = ctx.getNodeParameter('columns.value', index, {});
        data = fields;
    }
    return dataObjectToApiInput(data, ctx.getNode(), index);
}
//# sourceMappingURL=addRow.js.map