import { NodeOperationError, type IExecuteFunctions, type INodeExecutionData } from 'n8n-workflow';

import * as image from './image';
import type { OllamaType } from './node.type';
import * as text from './text';

export async function router(this: IExecuteFunctions) {
	const returnData: INodeExecutionData[] = [];

	const items = this.getInputData();
	const resource = this.getNodeParameter('resource', 0);
	const operation = this.getNodeParameter('operation', 0);

	const ollamaTypeData = {
		resource,
		operation,
	} as OllamaType;

	let execute;
	switch (ollamaTypeData.resource) {
		case 'image':
			execute = image[ollamaTypeData.operation].execute;
			break;
		case 'text':
			execute = text[ollamaTypeData.operation].execute;
			break;
		default:
			throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not supported!`);
	}

	for (let i = 0; i < items.length; i++) {
		try {
			const responseData = await execute.call(this, i);
			returnData.push.apply(returnData, responseData);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
				continue;
			}

			throw new NodeOperationError(this.getNode(), error, {
				itemIndex: i,
				description: error.description,
			});
		}
	}

	return [returnData];
}
