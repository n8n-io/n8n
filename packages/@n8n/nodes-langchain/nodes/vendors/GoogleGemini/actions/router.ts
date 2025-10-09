import { NodeOperationError, type IExecuteFunctions, type INodeExecutionData } from 'n8n-workflow';

import * as audio from './audio';
import * as document from './document';
import * as file from './file';
import * as image from './image';
import type { GoogleGeminiType } from './node.type';
import * as text from './text';
import * as video from './video';

export async function router(this: IExecuteFunctions) {
	const returnData: INodeExecutionData[] = [];

	const items = this.getInputData();
	const resource = this.getNodeParameter('resource', 0);
	const operation = this.getNodeParameter('operation', 0);

	const googleGeminiTypeData = {
		resource,
		operation,
	} as GoogleGeminiType;

	let execute;
	switch (googleGeminiTypeData.resource) {
		case 'audio':
			execute = audio[googleGeminiTypeData.operation].execute;
			break;
		case 'document':
			execute = document[googleGeminiTypeData.operation].execute;
			break;
		case 'file':
			execute = file[googleGeminiTypeData.operation].execute;
			break;
		case 'image':
			execute = image[googleGeminiTypeData.operation].execute;
			break;
		case 'text':
			execute = text[googleGeminiTypeData.operation].execute;
			break;
		case 'video':
			execute = video[googleGeminiTypeData.operation].execute;
			break;
		default:
			throw new NodeOperationError(
				this.getNode(),
				`The operation "${operation}" is not supported!`,
			);
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
