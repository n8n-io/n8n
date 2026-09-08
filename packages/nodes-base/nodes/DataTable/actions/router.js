import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import * as row from './row/Row.resource';
import * as table from './table/Table.resource';
import { DATA_TABLE_ID_FIELD } from '../common/fields';
import { getDataTableProxyExecute } from '../common/utils';
const BULK_OPERATIONS = ['insert'];
function hasBulkExecute(operation) {
    return BULK_OPERATIONS.includes(operation);
}
function hasComplexId(ctx) {
    const dataTableIdExpr = ctx.getNodeParameter(`${DATA_TABLE_ID_FIELD}.value`, 0, undefined, {
        rawExpressions: true,
    });
    return typeof dataTableIdExpr === 'string' && dataTableIdExpr.includes('{');
}
export async function router() {
    let operationResult = [];
    let responseData = [];
    const items = this.getInputData();
    const resource = this.getNodeParameter('resource', 0);
    const operation = this.getNodeParameter('operation', 0);
    const dataTableNodeData = {
        resource,
        operation,
    };
    if (dataTableNodeData.resource === 'table') {
        // Table operations
        for (let i = 0; i < items.length; i++) {
            try {
                const tableOperation = dataTableNodeData.operation === 'delete'
                    ? table.deleteTable
                    : table[dataTableNodeData.operation];
                responseData = await tableOperation.execute.call(this, i);
                const executionData = this.helpers.constructExecutionMetaData(responseData, {
                    itemData: { item: i },
                });
                operationResult = operationResult.concat(executionData);
            }
            catch (error) {
                if (this.continueOnFail()) {
                    const inputData = this.getInputData(i)[0].json;
                    if (error instanceof NodeApiError || error instanceof NodeOperationError) {
                        operationResult.push({ json: inputData, error });
                    }
                    else {
                        operationResult.push({
                            json: inputData,
                            error: new NodeOperationError(this.getNode(), error),
                        });
                    }
                }
                else {
                    throw error;
                }
            }
        }
    }
    else if (hasBulkExecute(dataTableNodeData.operation) && !hasComplexId(this)) {
        // Row bulk operations
        try {
            const proxy = await getDataTableProxyExecute(this);
            responseData = await row[dataTableNodeData.operation]['executeBulk'].call(this, proxy);
            operationResult = responseData;
        }
        catch (error) {
            if (this.continueOnFail()) {
                if (error instanceof NodeApiError || error instanceof NodeOperationError) {
                    operationResult = this.getInputData().map((json) => ({ json, error }));
                }
                else {
                    operationResult = this.getInputData().map((json) => ({ json }));
                }
            }
            else {
                throw error;
            }
        }
    }
    else {
        // Row operations
        for (let i = 0; i < items.length; i++) {
            try {
                responseData = await row[dataTableNodeData.operation].execute.call(this, i);
                const executionData = this.helpers.constructExecutionMetaData(responseData, {
                    itemData: { item: i },
                });
                // pushing here risks stack overflows for very high numbers (~100k) of results on filter-based queries (update, get, etc.)
                operationResult = operationResult.concat(executionData);
            }
            catch (error) {
                if (this.continueOnFail()) {
                    const inputData = this.getInputData(i)[0].json;
                    if (error instanceof NodeApiError || error instanceof NodeOperationError) {
                        operationResult.push({ json: inputData, error });
                    }
                    else {
                        operationResult.push({ json: inputData });
                    }
                }
                else {
                    throw error;
                }
            }
        }
    }
    return [operationResult];
}
//# sourceMappingURL=router.js.map