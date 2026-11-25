import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	JsonObject,
	IRequestOptions,
	RequestPath,
	WithRequestTarget,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

export async function demioApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: RequestPath,

	body: any = {},
	qs: IDataObject = {},
): Promise<any> {
	try {
		const credentials = await this.getCredentials('demioApi');
		const options: WithRequestTarget<IRequestOptions, 'uri'> = {
			headers: {
				'Api-Key': credentials.apiKey,
				'Api-Secret': credentials.apiSecret,
			},
			method,
			qs,
			body,
			uri: requestUrl`https://my.demio.com/api/v1${resource}`,
			json: true,
		};

		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
