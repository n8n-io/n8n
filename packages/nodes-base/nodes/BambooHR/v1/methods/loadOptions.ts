import {
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';

import {
	apiRequest,
} from '../transport';

// Get all the available channels
export async function getTimeOffTypeID(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const body: IDataObject = {};
	const requestMethod = 'GET';
	const endPoint = 'meta/time_off/types';

	const response = await apiRequest.call(this, requestMethod, endPoint, body);
	const timeOffTypeIds = response.body.timeOffTypes;

	for (const item of timeOffTypeIds) {
		returnData.push({
			name: item.name,
			value: item.id,
		});
	}
	return returnData;
}

