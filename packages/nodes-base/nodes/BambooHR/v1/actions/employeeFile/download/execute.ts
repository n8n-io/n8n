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

export async function download(this: IExecuteFunctions, index: number): Promise<any> {
	const body = {} as IDataObject;
	const requestMethod = 'GET';

	//meta data
	const id = this.getNodeParameter('id', index) as string;
	const fileId = this.getNodeParameter('fileId', index) as string;
	const output = 'data' as string;

	//endpoint
	const endPoint = `employees/${id}/files/${fileId}/`;

	//response
	const response = await apiRequest.call(this, requestMethod, endPoint, body);
	const mimeType = response.headers['content-type'];
	const fileName = response.headers['content-disposition'];

	//buffer
	const buffer = Buffer.from(response.body);

	const responseData = {
		json: {file: fileName},
		binary: {
			[output]: await this.helpers.prepareBinaryData(buffer as unknown as Buffer, fileName, mimeType),
		},
	};

	return this.prepareOutputData(responseData as unknown as INodeExecutionData[]);
}
