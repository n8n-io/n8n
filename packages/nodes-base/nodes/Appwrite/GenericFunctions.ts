import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject, NodeApiError,
} from 'n8n-workflow';

export async function appwriteApiRequest(this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions | IWebhookFunctions, method: string, collectionId: string, documentId: string, body: any = {}, qs: IDataObject = {}, uri?: string, headers: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const credentials = await this.getCredentials('appwriteApi') as IDataObject;

	try {
		const options: OptionsWithUri = {
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json',
				'X-Appwrite-Project': `${credentials.projectId}`,
				'X-Appwrite-Key': `${credentials.apiKey}`,
			},
			method,
			body,
			qs,
			uri: uri || `${credentials.url}/v1/database/collections/${collectionId}/documents`,
			json: true,
			qsStringifyOptions: {
				arrayFormat: 'indice',
			},
		};
		if(documentId) {
			options.uri += `/${documentId}`;
		}
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		if (Object.keys(body).length === 0) {
			delete options.body;
		}

		//@ts-ignore
		return await this.helpers?.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
