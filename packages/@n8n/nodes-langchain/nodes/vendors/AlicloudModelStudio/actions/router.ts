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

	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		try {
			let executionData: INodeExecutionData;

			if (resource === 'text') {
				if (operation === 'message') {
					executionData = await text.message.execute.call(this, itemIndex);
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`The operation "${operation}" is not supported for resource "${resource}"`,
					);
				}
			} else if (resource === 'image') {
				if (operation === 'analyze') {
					executionData = await image.analyze.execute.call(this, itemIndex);
				} else if (operation === 'generate') {
					executionData = await image.generate.execute.call(this, itemIndex);
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`The operation "${operation}" is not supported for resource "${resource}"`,
					);
				}
			} else if (resource === 'video') {
				if (operation === 'textToVideo') {
					executionData = await video.textToVideo.execute.call(this, itemIndex);
				} else if (operation === 'imageToVideo') {
					executionData = await video.imageToVideo.execute.call(this, itemIndex);
				} else if (operation === 'download') {
					executionData = await video.download.execute.call(this, itemIndex);
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`The operation "${operation}" is not supported for resource "${resource}"`,
					);
				}
			} else {
				throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not supported`);
			}

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
