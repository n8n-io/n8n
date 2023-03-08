import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import { apiRequest } from '../../../transport';

export async function upload(this: IExecuteFunctions, index: number) {
	let body: IDataObject = {};
	const requestMethod = 'POST';

	const category = this.getNodeParameter('categoryId', index) as string;
	const share = this.getNodeParameter('options.share', index, true) as boolean;

	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', index);
	const { fileName, mimeType } = this.helpers.assertBinaryData(index, binaryPropertyName);
	const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(index, binaryPropertyName);

	body = {
		json: false,
		formData: {
			file: {
				value: binaryDataBuffer,
				options: {
					filename: fileName,
					contentType: mimeType,
				},
			},
			fileName,
			category,
		},
		resolveWithFullResponse: true,
	};

	if (body.formData) {
		Object.assign(body.formData, share ? { share: 'yes' } : { share: 'no' });
	}

	//endpoint
	const endpoint = 'files';
	const { headers } = await apiRequest.call(this, requestMethod, endpoint, {}, {}, body);
	return this.helpers.returnJsonArray({ fileId: headers.location.split('/').pop() });
}
