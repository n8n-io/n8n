import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import { processAirtableError } from '../../helpers/utils';
import { apiRequest } from '../../transport';
import { baseRLC } from '../common.descriptions';
const properties = [
    {
        ...baseRLC,
        description: 'The Airtable Base to retrieve the schema from',
    },
];
const displayOptions = {
    show: {
        resource: ['base'],
        operation: ['getSchema'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(items) {
    let returnData = [];
    for (let i = 0; i < items.length; i++) {
        try {
            const baseId = this.getNodeParameter('base', i, undefined, {
                extractValue: true,
            });
            const responseData = await apiRequest.call(this, 'GET', `meta/bases/${baseId}/tables`);
            const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData.tables), {
                itemData: { item: i },
            });
            returnData = returnData.concat(executionData);
        }
        catch (error) {
            error = processAirtableError(error, undefined, i);
            if (this.continueOnFail()) {
                returnData.push({ json: { error: error.message } });
                continue;
            }
            throw error;
        }
    }
    return returnData;
}
//# sourceMappingURL=getSchema.operation.js.map