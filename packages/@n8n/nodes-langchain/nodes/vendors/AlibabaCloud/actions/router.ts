import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import * as text from './text';
import * as image from './image';
import * as video from './video';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	const resource = this.getNodeParameter('resource', 0) as string;
	const operation = this.getNodeParameter('operation', 0) as string;

	let execute;
	switch (resource) {
		case 'text':
			switch (operation) {
				case 'message':
					execute = text.message.execute;
					break;
				default:
					throw new NodeOperationError(
						this.getNode(),
						`The operation "${operation}" is not supported for resource "${resource}"`,
					);
			}
			break;
		case 'image':
			switch (operation) {
				case 'analyze':
					execute = image.analyze.execute;
					break;
				case 'generate':
					execute = image.generate.execute;
					break;
				default:
					throw new NodeOperationError(
						this.getNode(),
						`The operation "${operation}" is not supported for resource "${resource}"`,
					);
			}
			break;
		case 'video':
			switch (operation) {
				case 'textToVideo':
					execute = video.textToVideo.execute;
					break;
				case 'imageToVideo':
					execute = video.imageToVideo.execute;
					break;
				default:
					throw new NodeOperationError(
						this.getNode(),
						`The operation "${operation}" is not supported for resource "${resource}"`,
					);
			}
			break;
		default:
			throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not supported`);
	}

	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		try {
			const executionData = await execute.call(this, itemIndex);
			returnData.push(executionData);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({
					json: {
						error: error instanceof Error ? error.message : String(error),
					},
					pairedItem: { item: itemIndex },
				});
				continue;
			}
			throw new NodeOperationError(this.getNode(), error, {
				itemIndex,
			});
		}
	}

	return [returnData];
}
