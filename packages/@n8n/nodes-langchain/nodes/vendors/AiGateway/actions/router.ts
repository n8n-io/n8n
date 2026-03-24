import { NodeOperationError, type IExecuteFunctions, type INodeExecutionData } from 'n8n-workflow';

import * as audio from './audio';
import * as file from './file';
import * as image from './image';
import type { AiGatewayType } from './node.type';
import * as text from './text';

export async function router(this: IExecuteFunctions) {
	const returnData: INodeExecutionData[] = [];

	const items = this.getInputData();
	const resource = this.getNodeParameter('resource', 0);
	const operation = this.getNodeParameter('operation', 0);

	const aiGatewayTypeData = {
		resource,
		operation,
	} as AiGatewayType;

	let execute;
	switch (aiGatewayTypeData.resource) {
		case 'audio':
			execute = audio[aiGatewayTypeData.operation].execute;
			break;
		case 'file':
			execute = file[aiGatewayTypeData.operation].execute;
			break;
		case 'image':
			execute = image[aiGatewayTypeData.operation].execute;
			break;
		case 'text':
			execute = text[aiGatewayTypeData.operation].execute;
			break;
		default:
			throw new NodeOperationError(
				this.getNode(),
				`The operation "${String(operation)}" is not supported!`,
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
