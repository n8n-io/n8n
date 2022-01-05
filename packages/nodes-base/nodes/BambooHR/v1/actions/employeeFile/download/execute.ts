import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import {
	apiRequest,
} from '../../../transport';

export async function download(this: IExecuteFunctions, index: number) {
	const body: IDataObject = {};
	const requestMethod = 'GET';
	const items = this.getInputData();

	//meta data
	const id: string = this.getNodeParameter('id', index) as string;
	const fileId: string = this.getNodeParameter('fileId', index) as string;
	const output: string = this.getNodeParameter('output', index) as string;

	//endpoint
	const endpoint = `employees/${id}/files/${fileId}/`;

	//response
	const response = await apiRequest.call(this, requestMethod, endpoint, body, {} as IDataObject, { encoding: null, json: false });
	const mimeType = response.headers['content-type'];
	const fileName = response.headers['content-disposition'];

	const newItem: INodeExecutionData = {
		json: items[index].json,
		binary: {},
	};

	if (items[index].binary !== undefined) {
		// Create a shallow copy of the binary data so that the old
		// data references which do not get changed still stay behind
		// but the incoming data does not get changed.
		Object.assign(newItem.binary, items[index].binary);
	}

	newItem.binary = {
		[output]: await this.helpers.prepareBinaryData(response.body as unknown as Buffer, fileName, mimeType),
	};

	return this.prepareOutputData(newItem as unknown as INodeExecutionData[]);
}
