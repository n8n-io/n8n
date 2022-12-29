import { IExecuteFunctions } from 'n8n-core';

import { IBinaryKeyData, IDataObject, NodeOperationError } from 'n8n-workflow';

import { apiRequest } from '../../../transport';

export async function upload(this: IExecuteFunctions, index: number) {
	let body: IDataObject = {};
	const requestMethod = 'POST';

	const items = this.getInputData();

	const category = this.getNodeParameter('categoryId', index) as string;
	const share = this.getNodeParameter('options.share', index, true) as boolean;

	if (items[index].binary === undefined) {
		throw new NodeOperationError(this.getNode(), 'No binary data exists on item!', {
			itemIndex: index,
		});
	}

	const propertyNameUpload = this.getNodeParameter('binaryPropertyName', index) as string;

	if (items[index]!.binary![propertyNameUpload] === undefined) {
		throw new NodeOperationError(
			this.getNode(),
			`No binary data property "${propertyNameUpload}" does not exists on item!`,
			{ itemIndex: index },
		);
	}

	const item = items[index].binary as IBinaryKeyData;

	const binaryData = item[propertyNameUpload];

	const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(index, propertyNameUpload);

	body = {
		json: false,
		formData: {
			file: {
				value: binaryDataBuffer,
				options: {
					filename: binaryData.fileName,
					contentType: binaryData.mimeType,
				},
			},
			fileName: binaryData.fileName,
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
