import type {
	ICredentialDataDecryptedObject,
	ICredentialTestFunctions,
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	RequestPath,
	WithRequestTarget,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

export async function dhlApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	path: RequestPath,

	body: any = {},
	qs: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials<{ apiKey: string }>('dhlApi');

	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers: {
			'DHL-API-Key': credentials.apiKey,
		},
		method,
		qs,
		body,
		uri: requestUrl`https://api-eu.dhl.com${path}`,
		json: true,
	};
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
