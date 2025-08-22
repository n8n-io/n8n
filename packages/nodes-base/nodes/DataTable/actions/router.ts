import type { IExecuteFunctions, INodeExecutionData, AllEntities } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import * as row from './row/Row.resource';

type DataStoreNodeType = AllEntities<{ row: 'insert' | 'get' }>;

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const operationResult: INodeExecutionData[] = [];
	let responseData: INodeExecutionData[] = [];

	const items = this.getInputData();
	const resource = this.getNodeParameter('resource', 0);
	const operation = this.getNodeParameter('operation', 0);

	const dataStoreNodeData = {
		resource,
		operation,
	} as DataStoreNodeType;

	for (let i = 0; i < items.length; i++) {
		try {
			switch (dataStoreNodeData.resource) {
				case 'row':
					responseData = await row[dataStoreNodeData.operation].execute.call(this, i);
					break;
				default:
					throw new NodeOperationError(
						this.getNode(),
						`The resource "${resource}" is not supported!`,
					);
			}

			const executionData = this.helpers.constructExecutionMetaData(responseData, {
				itemData: { item: i },
			});

			operationResult.push.apply(operationResult, executionData);
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

	return [operationResult];
}
