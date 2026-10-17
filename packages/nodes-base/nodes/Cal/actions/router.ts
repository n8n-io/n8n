import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import * as booking from './booking';
import * as eventType from './eventType';
import * as schedule from './schedule';
import * as slot from './slot';

/**
 * Compile-checked contract for operation modules. The router calls
 * `<resource>.<operation>.execute.call(this, i)` once for each item, and owns
 * both the item loop and the `continueOnFail` branch.
 */
export type CalOperation = (
	this: IExecuteFunctions,
	itemIndex: number,
) => Promise<IDataObject | IDataObject[]>;

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const resource = this.getNodeParameter('resource', 0, '');
	const operation = this.getNodeParameter('operation', 0, '');

	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			let responseData: IDataObject | IDataObject[];

			switch (`${resource}:${operation}`) {
				case 'booking:cancel':
					responseData = await booking.cancel.execute.call(this, i);
					break;
				case 'booking:create':
					responseData = await booking.create.execute.call(this, i);
					break;
				case 'booking:get':
					responseData = await booking.get.execute.call(this, i);
					break;
				case 'booking:getMany':
					responseData = await booking.getMany.execute.call(this, i);
					break;
				case 'booking:reschedule':
					responseData = await booking.reschedule.execute.call(this, i);
					break;
				case 'eventType:get':
					responseData = await eventType.get.execute.call(this, i);
					break;
				case 'eventType:getMany':
					responseData = await eventType.getMany.execute.call(this, i);
					break;
				case 'schedule:create':
					responseData = await schedule.create.execute.call(this, i);
					break;
				case 'schedule:delete':
					responseData = await schedule.delete.execute.call(this, i);
					break;
				case 'schedule:get':
					responseData = await schedule.get.execute.call(this, i);
					break;
				case 'schedule:getMany':
					responseData = await schedule.getMany.execute.call(this, i);
					break;
				case 'schedule:update':
					responseData = await schedule.update.execute.call(this, i);
					break;
				case 'slot:getMany':
					responseData = await slot.getMany.execute.call(this, i);
					break;
				default:
					throw new NodeOperationError(
						this.getNode(),
						`The operation "${resource}:${operation}" is not supported`,
					);
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData),
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
