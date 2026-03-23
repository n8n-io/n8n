import { NodeOperationError, type IExecuteFunctions, type INodeExecutionData } from 'n8n-workflow';

import * as document from './document';
import * as file from './file';
import * as image from './image';
import type { AnthropicType } from './node.type';
import * as prompt from './prompt';
import * as text from './text';

export async function router(this: IExecuteFunctions) {
	const returnData: INodeExecutionData[] = [];

	const items = this.getInputData();
	const resource = this.getNodeParameter('resource', 0);
	const operation = this.getNodeParameter('operation', 0);

	const anthropicTypeData = {
		resource,
		operation,
	} as AnthropicType;

	let execute;
	switch (anthropicTypeData.resource) {
		case 'document':
			execute = document[anthropicTypeData.operation].execute;
			break;
		case 'file':
			execute = file[anthropicTypeData.operation].execute;
			break;
		case 'image':
			execute = image[anthropicTypeData.operation].execute;
			break;
		case 'prompt':
			execute = prompt[anthropicTypeData.operation].execute;
			break;
		case 'text':
			execute = text[anthropicTypeData.operation].execute;
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
