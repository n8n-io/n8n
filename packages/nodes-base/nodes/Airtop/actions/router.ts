import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import * as extraction from './extraction/Extraction.resource';
import * as interaction from './interaction/Interaction.resource';
import type { AirtopType } from './node.type';
import * as session from './session/Session.resource';
import * as window from './window/Window.resource';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const operationResult: INodeExecutionData[] = [];
	let responseData: IDataObject | IDataObject[] = [];

	const items = this.getInputData();
	const resource = this.getNodeParameter<AirtopType>('resource', 0);
	const operation = this.getNodeParameter('operation', 0);

	const airtopNodeData = {
		resource,
		operation,
	} as AirtopType;

	for (let i = 0; i < items.length; i++) {
		try {
			switch (airtopNodeData.resource) {
				case 'session':
					responseData = await session[airtopNodeData.operation].execute.call(this, i);
					break;
				case 'window':
					responseData = await window[airtopNodeData.operation].execute.call(this, i);
					break;
				case 'interaction':
					responseData = await interaction[airtopNodeData.operation].execute.call(this, i);
					break;
				case 'extraction':
					responseData = await extraction[airtopNodeData.operation].execute.call(this, i);
					break;
				default:
					throw new NodeOperationError(
						this.getNode(),
						`The resource "${resource}" is not supported!`,
					);
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData),
				{ itemData: { item: i } },
			);
			operationResult.push(...executionData);
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
