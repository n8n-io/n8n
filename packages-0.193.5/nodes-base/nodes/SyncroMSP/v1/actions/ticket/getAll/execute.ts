import { IExecuteFunctions } from 'n8n-core';

import { IDataObject, INodeExecutionData } from 'n8n-workflow';

import { apiRequest, apiRequestAllItems } from '../../../transport';

export async function getAll(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const returnAll = this.getNodeParameter('returnAll', index) as boolean;
	const filters = this.getNodeParameter('filters', index) as IDataObject;

	let qs = {} as IDataObject;
	const requestMethod = 'GET';
	const endpoint = 'tickets';
	const body = {} as IDataObject;

	if (filters) {
		qs = filters;
	}

	if (returnAll === false) {
		qs.per_page = this.getNodeParameter('limit', index) as number;
	}

	let responseData;
	if (returnAll) {
		responseData = await apiRequestAllItems.call(this, requestMethod, endpoint, body, qs);
		return this.helpers.returnJsonArray(responseData);
	} else {
		responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
		return this.helpers.returnJsonArray(responseData.tickets);
	}
}
