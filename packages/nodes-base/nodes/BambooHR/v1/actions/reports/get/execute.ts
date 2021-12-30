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

export async function get(this: IExecuteFunctions, index: number){
	const body: IDataObject = {};
	const requestMethod = 'GET';

	//meta data
	const id = this.getNodeParameter('id', index) as string;
	const format = this.getNodeParameter('format', 0) as string;

	//endpoint
	const endpoint = `reports/${id}/?format=${format}`;

	if (format === 'JSON') {
		const responseData = await apiRequest.call(this, requestMethod, endpoint, body);
		return this.helpers.returnJsonArray(responseData);
	}

	const response = await apiRequest.call(this, requestMethod, endpoint, body, {} as IDataObject, 'arraybuffer');
	const mimeType = response.headers['content-type'];
	const fileName = response.headers['content-disposition'];

	const responseData = {
		json: {file: fileName},
		binary: {
			['data']: await this.helpers.prepareBinaryData(response.body as unknown as Buffer, fileName, mimeType),
		},
	};

	return this.prepareOutputData(responseData as unknown as INodeExecutionData[]);
}
