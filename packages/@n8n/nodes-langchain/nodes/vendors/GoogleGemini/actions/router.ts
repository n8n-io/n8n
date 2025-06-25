import { NodeOperationError, type IExecuteFunctions, type INodeExecutionData } from 'n8n-workflow';

import type { GoogleGeminiType } from './node.type';

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
			// TODO:
			break;
		case 'document':
			// TODO:
			break;
		case 'image':
			// TODO:
			break;
		case 'text':
			// TODO:
			break;
		case 'video':
			// TODO:
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
