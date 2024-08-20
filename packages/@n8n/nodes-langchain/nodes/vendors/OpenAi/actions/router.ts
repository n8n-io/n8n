import {
	NodeOperationError,
	type IExecuteFunctions,
	type INodeExecutionData,
	NodeApiError,
} from 'n8n-workflow';

import * as assistant from './assistant';
import * as audio from './audio';
import * as file from './file';
import * as image from './image';
import * as text from './text';

import type { OpenAiType } from './node.type';

export async function router(this: IExecuteFunctions) {
	const returnData: INodeExecutionData[] = [];

	const items = this.getInputData();
	const resource = this.getNodeParameter<OpenAiType>('resource', 0);
	const operation = this.getNodeParameter('operation', 0);

	const openAiTypeData = {
		resource,
		operation,
	} as OpenAiType;

	let execute;
	switch (openAiTypeData.resource) {
		case 'assistant':
			execute = assistant[openAiTypeData.operation].execute;
			break;
		case 'audio':
			execute = audio[openAiTypeData.operation].execute;
			break;
		case 'file':
			execute = file[openAiTypeData.operation].execute;
			break;
		case 'image':
			execute = image[openAiTypeData.operation].execute;
			break;
		case 'text':
			execute = text[openAiTypeData.operation].execute;
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
			if (this.continueOnFail(error)) {
				returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
				continue;
			}

			if (error instanceof NodeApiError) {
				error.context = {
					itemIndex: i,
				};

				throw error;
			}

			throw new NodeOperationError(this.getNode(), error, {
				itemIndex: i,
				description: error.description,
			});
		}
	}

	return [returnData];
}
