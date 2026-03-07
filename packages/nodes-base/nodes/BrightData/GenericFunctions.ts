import type {
	IExecuteFunctions,
	IHookFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	JsonObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
	INodeExecutionData,
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

/**
 * Make an API request to Github
 *
 */
export async function brightdataApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: object,
	query?: IDataObject,
	option: IDataObject = {},
): Promise<any> {
	const options: IHttpRequestOptions = {
		method,
		headers: {
			'User-Agent': 'n8n',
			'Content-Type': 'application/json',
		},
		body,
		qs: query,
		url: 'https://api.brightdata.com',
		json: true,
	};

	if (Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

	options.url += endpoint;
	try {
		console.log('Request to BrightData API:', JSON.stringify(options, null, 2));
		const response = await this.helpers.requestWithAuthentication.call(
			this,
			'brightdataApi',
			options,
		);
		if (endpoint.indexOf('filter') !== -1) {
			console.log('Response from BrightData API:', response);
		}

		return response;
	} catch (error) {
		console.log('Error in brightdataApiRequest', error);
		return new NodeApiError(this.getNode(), {
			statusCode: error.httpCode,
			description: error.description,
		} as unknown as JsonObject);
	}
}

export async function sendErrorPostReceive(
	this: IExecuteSingleFunctions,
	data: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (String(response.statusCode).startsWith('4') || String(response.statusCode).startsWith('5')) {
		throw new NodeApiError(this.getNode(), response as unknown as JsonObject);
	}
	return data;
}
