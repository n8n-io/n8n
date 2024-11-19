import type {
	ICredentialDataDecryptedObject,
	ICredentialTestFunctions,
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function dhlApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	path: string,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials<{ apiKey: string }>('dhlApi');

	let options: IRequestOptions = {
		headers: {
			'DHL-API-Key': credentials.apiKey,
		},
		method,
		qs,
		body,
		uri: uri || `https://api-eu.dhl.com${path}`,
		json: true,
	};
	options = Object.assign({}, options, option);
	if (Object.keys(options.body as IDataObject).length === 0) {
		delete options.body;
	}

	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function validateCredentials(
	this: ICredentialTestFunctions,
	decryptedCredentials: ICredentialDataDecryptedObject,
): Promise<any> {
	const credentials = decryptedCredentials;

	const { apiKey } = credentials as {
		apiKey: string;
	};

	const options: IRequestOptions = {
		headers: {
			'DHL-API-Key': apiKey,
		},
		qs: {
			trackingNumber: 123,
		},
		method: 'GET',
		uri: 'https://api-eu.dhl.com/track/shipments',
		json: true,
	};

	return await this.helpers.request(options);
}
