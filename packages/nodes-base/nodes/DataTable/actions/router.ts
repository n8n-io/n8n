import type {
	IExecuteFunctions,
	INodeExecutionData,
	AllEntities,
	NodeOperationError,
} from 'n8n-workflow';

import * as row from './row/Row.resource';
import { DATA_TABLE_ID_FIELD } from '../common/fields';
import { getDataTableProxyExecute } from '../common/utils';

type DataTableNodeType = AllEntities<{
	row: 'insert' | 'get' | 'rowExists' | 'rowNotExists' | 'deleteRows' | 'update' | 'upsert';
}>;

const BULK_OPERATIONS = ['insert'] as const;

function hasBulkExecute(operation: string): operation is (typeof BULK_OPERATIONS)[number] {
	return (BULK_OPERATIONS as readonly string[]).includes(operation);
}

function hasComplexId(ctx: IExecuteFunctions) {
	const dataTableIdExpr = ctx.getNodeParameter(`${DATA_TABLE_ID_FIELD}.value`, 0, undefined, {
		rawExpressions: true,
	});

	return typeof dataTableIdExpr === 'string' && dataTableIdExpr.includes('{');
}

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	let operationResult: INodeExecutionData[] = [];
	let responseData: INodeExecutionData[] = [];

	const items = this.getInputData();
	const resource = this.getNodeParameter('resource', 0);
	const operation = this.getNodeParameter('operation', 0);

	const dataTableNodeData = {
		resource,
		operation,
	} as DataTableNodeType;

	// If the operation supports
	if (hasBulkExecute(dataTableNodeData.operation) && !hasComplexId(this)) {
		try {
			const proxy = await getDataTableProxyExecute(this);

			responseData = await row[dataTableNodeData.operation]['executeBulk'].call(this, proxy);

			operationResult = responseData;
		} catch (error) {
			if (this.continueOnFail()) {
				operationResult = this.getInputData().map((json) => ({
					json,
					error: error as NodeOperationError,
				}));
			} else {
				throw error;
			}
		}
	} else {
		for (let i = 0; i < items.length; i++) {
			try {
				responseData = await row[dataTableNodeData.operation].execute.call(this, i);
				const executionData = this.helpers.constructExecutionMetaData(responseData, {
					itemData: { item: i },
				});

				// pushing here risks stack overflows for very high numbers (~100k) of results on filter-based queries (update, get, etc.)
				operationResult = operationResult.concat(executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					operationResult.push({
						json: this.getInputData(i)[0].json,
						error: error as NodeOperationError,
					});
				} else {
					throw error;
				}
			}
		}
	}

	return [operationResult];
}
