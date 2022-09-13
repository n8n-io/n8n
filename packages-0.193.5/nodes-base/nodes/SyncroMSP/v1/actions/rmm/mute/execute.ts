import { IExecuteFunctions } from 'n8n-core';

import { IDataObject, INodeExecutionData } from 'n8n-workflow';

import { apiRequest } from '../../../transport';

export async function muteAlert(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const id = this.getNodeParameter('alertId', index) as string;
	const mute = this.getNodeParameter('muteFor', index) as string;

	const qs = {} as IDataObject;
	const requestMethod = 'POST';
	const endpoint = `rmm_alerts/${id}/mute`;
	const body = {} as IDataObject;

	body.id = id;
	body.mute_for = mute;

	let responseData;
	responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
	return this.helpers.returnJsonArray(responseData);
}
