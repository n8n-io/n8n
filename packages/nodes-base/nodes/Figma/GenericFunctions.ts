import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	JsonObject,
	IRequestOptions,
	IHttpRequestMethods,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

export async function figmaApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: RequestPath,

	body: any = {},
	_qs: IDataObject = {},
): Promise<any> {
	const authentication = this.getNodeParameter('authentication', 0, 'accessToken') as string;

	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		method,
		body,
		uri: requestUrl`https://api.figma.com${resource}`,
		json: true,
	};
	if (Object.keys(options.body as IDataObject).length === 0) {
		delete options.body;
	}

	try {
		if (authentication === 'oAuth2') {
			return await this.helpers.requestWithAuthentication.call(this, 'figmaOAuth2Api', options);
		}

		const credentials = await this.getCredentials('figmaApi');
		options.headers = { 'X-FIGMA-TOKEN': credentials.accessToken };
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
