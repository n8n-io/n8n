import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

import {
	apiRequest,
} from '../../../transport';

export async function upload(this: IExecuteFunctions, index: number){
	const body: IDataObject = {};
	const requestMethod = 'POST';

	body.file = this.getNodeParameter('file', index) as string;
	body.fileName = this.getNodeParameter('fileName', index) as string;
	body.category = this.getNodeParameter('category', index) as string;
	const share = this.getNodeParameter('share', index) as boolean;
	share ? body.share = 'yes' : body.share = 'no';

	//meta data
	const id: string = this.getNodeParameter('id', index) as string;

	//endpoint
	const endpoint = `employees/${id}/files`;
	const responseData = await apiRequest.call(this, requestMethod, endpoint, { formData: body }, {} as IDataObject, 'json', 'multipart/form-data');
	return this.helpers.returnJsonArray({ statusCode: responseData.statusCode, statusMessage: responseData.statusMessage });
}
