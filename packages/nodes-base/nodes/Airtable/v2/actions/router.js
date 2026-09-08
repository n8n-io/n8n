import { NodeOperationError } from 'n8n-workflow';
import * as base from './base/Base.resource';
import * as record from './record/Record.resource';
export async function router() {
    let returnData = [];
    const items = this.getInputData();
    const resource = this.getNodeParameter('resource', 0);
    const operation = this.getNodeParameter('operation', 0);
    const airtableNodeData = {
        resource,
        operation,
    };
    try {
        switch (airtableNodeData.resource) {
            case 'record':
                const baseId = this.getNodeParameter('base', 0, undefined, {
                    extractValue: true,
                });
                const table = encodeURI(this.getNodeParameter('table', 0, undefined, {
                    extractValue: true,
                }));
                returnData = await record[airtableNodeData.operation].execute.call(this, items, baseId, table);
                break;
            case 'base':
                returnData = await base[airtableNodeData.operation].execute.call(this, items);
                break;
            default:
                throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported!`);
        }
    }
    catch (error) {
        if (error.description &&
            error.description.includes('cannot accept the provided value')) {
            error.description = `${error.description}. Consider using 'Typecast' option`;
        }
        throw error;
    }
    return [returnData];
}
//# sourceMappingURL=router.js.map