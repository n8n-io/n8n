import { NodeOperationError, type IExecuteFunctions, type INodeExecutionData } from 'n8n-workflow';

import * as audio from './audio';
import * as image from './image';
import type { MiniMaxType } from './node.type';
import * as text from './text';
import * as video from './video';

export async function router(this: IExecuteFunctions) {
	const returnData: INodeExecutionData[] = [];

	const items = this.getInputData();
	const resource = this.getNodeParameter('resource', 0);
	const operation = this.getNodeParameter('operation', 0);

	const miniMaxTypeData = {
		resource,
		operation,
	} as MiniMaxType;

	let execute;
	switch (miniMaxTypeData.resource) {
		case 'audio':
			execute = audio[miniMaxTypeData.operation].execute;
			break;
		case 'image':
			execute = image[miniMaxTypeData.operation].execute;
			break;
		case 'text':
			execute = text[miniMaxTypeData.operation].execute;
			break;
		case 'video':
			execute = video[miniMaxTypeData.operation].execute;
			break;
		default:
			throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not supported!`);
	}

	for (let i = 0; i < items.length; i++) {
		try {
			const responseData = await execute.call(this, i);
			returnData.push(...responseData);
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
