import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import * as attachment from './attachment';
import * as page from './page';

/**
 * Compile-checked contract for operation modules. The router calls
 * `<resource>.<operation>.execute.call(this, i)` once per item.
 */
export type ConfluenceOperation = (
	this: IExecuteFunctions,
	itemIndex: number,
) => Promise<IDataObject | IDataObject[]>;

/** Variant for operations that emit their own execution items (e.g. binary output). */
export type ConfluenceBinaryOperation = (
	this: IExecuteFunctions,
	itemIndex: number,
) => Promise<INodeExecutionData[]>;

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const resource = this.getNodeParameter('resource', 0, '');
	const operation = this.getNodeParameter('operation', 0, '');

	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			let responseData: IDataObject | IDataObject[] | undefined;
			let responseItems: INodeExecutionData[] | undefined;

			switch (`${resource}:${operation}`) {
				case 'attachment:getMany':
					responseItems = await attachment.getMany.execute.call(this, i);
					break;
				case 'page:append':
					responseData = await page.append.execute.call(this, i);
					break;
				case 'page:create':
					responseData = await page.create.execute.call(this, i);
					break;
				case 'page:delete':
					responseData = await page.delete.execute.call(this, i);
					break;
				case 'page:get':
					responseData = await page.get.execute.call(this, i);
					break;
				case 'page:update':
					responseData = await page.update.execute.call(this, i);
					break;
				default:
					throw new NodeOperationError(
						this.getNode(),
						`The operation "${resource}:${operation}" is not supported`,
					);
			}

			const executionData = this.helpers.constructExecutionMetaData(
				responseItems ?? this.helpers.returnJsonArray(responseData ?? []),
				{ itemData: { item: i } },
			);
			returnData.push.apply(returnData, executionData);
		} catch (error) {
			if (this.continueOnFail()) {
				const message = error instanceof Error ? error.message : String(error);
				const errorData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray({ error: message }),
					{ itemData: { item: i } },
				);
				returnData.push.apply(returnData, errorData);
				continue;
			}
			throw error;
		}
	}

	return [returnData];
}
