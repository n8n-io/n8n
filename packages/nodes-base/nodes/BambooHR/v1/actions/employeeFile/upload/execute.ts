import {
	BINARY_ENCODING,
	IExecuteFunctions,
} from 'n8n-core';

import {
	IBinaryData,
	IBinaryKeyData,
	IDataObject, NodeOperationError,
} from 'n8n-workflow';

import {
	apiRequest,
} from '../../../transport';

export async function upload(this: IExecuteFunctions, index: number) {
	let body: IDataObject = {};
	const requestMethod = 'POST';

	const items = this.getInputData();

	const category = this.getNodeParameter('categoryId', index) as string;
	const share = this.getNodeParameter('share', index) as boolean;
	share ? body.share = 'yes' : body.share = 'no';

	if (items[index].binary === undefined) {
		throw new NodeOperationError(this.getNode(), 'No binary data exists on item!');
	}

	const propertyNameUpload = this.getNodeParameter('binaryPropertyName', index) as string;

	if (items[index]!.binary![propertyNameUpload] === undefined) {
		throw new NodeOperationError(this.getNode(), `No binary data property "${propertyNameUpload}" does not exists on item!`);
	}

	const item = items[index].binary as IBinaryKeyData;

	const binaryData = item[propertyNameUpload] as IBinaryData;

	const file = Buffer.from(binaryData.data, BINARY_ENCODING) as Buffer;

	//meta data
	const id: string = this.getNodeParameter('id', index) as string;

	body = {
		headers: {
			'content-type': 'multipart/form-data',
		},
		json: false,
		formData: {
			fileName: binaryData.fileName,
			share,
			category,
			file: {
				value: file,
				options: {
					filename: binaryData.fileName,
				},
			},
		},
	};

	//endpoint
	const endpoint = `employees/${id}/files`;
	const responseData = await apiRequest.call(this, requestMethod, endpoint, {}, {}, body);
	return this.helpers.returnJsonArray({ statusCode: responseData.statusCode, statusMessage: responseData.statusMessage });
}
