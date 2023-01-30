import type { IExecuteFunctions } from 'n8n-core';

import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

import { apiRequest } from '../../../transport';

export async function get(this: IExecuteFunctions, index: number) {
	const body: IDataObject = {};
	const requestMethod = 'GET';
	const items = this.getInputData();

	//meta data
	const reportId = this.getNodeParameter('reportId', index) as string;
	const format = this.getNodeParameter('format', 0) as string;
	const fd = this.getNodeParameter('options.fd', index, true) as boolean;

	//endpoint
	const endpoint = `reports/${reportId}/?format=${format}&fd=${fd}`;

	if (format === 'JSON') {
		const responseData = await apiRequest.call(
			this,
			requestMethod,
			endpoint,
			body,
			{},
			{ resolveWithFullResponse: true },
		);
		return this.helpers.returnJsonArray(responseData.body);
	}

	const output: string = this.getNodeParameter('output', index) as string;

	const response = await apiRequest.call(this, requestMethod, endpoint, body, {} as IDataObject, {
		encoding: null,
		json: false,
		resolveWithFullResponse: true,
	});
	let mimeType = response.headers['content-type'] as string | undefined;
	mimeType = mimeType ? mimeType.split(';').find((value) => value.includes('/')) : undefined;
	const contentDisposition = response.headers['content-disposition'];
	const fileNameRegex = /(?<=filename=").*\b/;
	const match = fileNameRegex.exec(contentDisposition);
	let fileName = '';

	// file name was found
	if (match !== null) {
		fileName = match[0];
	}

	const newItem: INodeExecutionData = {
		json: items[index].json,
		binary: {},
	};

	if (items[index].binary !== undefined && newItem.binary) {
		// Create a shallow copy of the binary data so that the old
		// data references which do not get changed still stay behind
		// but the incoming data does not get changed.
		Object.assign(newItem.binary, items[index].binary);
	}

	newItem.binary = {
		[output]: await this.helpers.prepareBinaryData(
			response.body as unknown as Buffer,
			fileName,
			mimeType,
		),
	};

	return this.prepareOutputData(newItem as unknown as INodeExecutionData[]);
}
