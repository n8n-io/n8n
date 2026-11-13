import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	JsonObject,
	IRequestOptions,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

/**
 * Make an API request to Mattermost
 */
export async function apiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: 'GET' | 'POST' | 'PUT' | 'DELETE',
	endpoint: RequestPath,
	body: string[] | IDataObject = {},
	query: IDataObject = {},
	option: Pick<IRequestOptions, 'encoding' | 'formData' | 'json' | 'resolveWithFullResponse'> = {},
) {
	const credentials = await this.getCredentials('bambooHrApi');

	//set-up credentials
	const apiKey = credentials.apiKey;
	const subdomain = credentials.subdomain;

	const options: WithRequestTarget<IRequestOptions> = {
		method,
		body,
		qs: query,
		url: requestUrl`https://api.bamboohr.com/api/gateway.php/${subdomain}/v1/${endpoint}`,
		auth: {
			username: apiKey as string,
			password: 'x',
		},
		json: true,
	};

	if (Object.keys(option).length) {
		Object.assign(options, option);
	}

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(query).length) {
		delete options.qs;
	}

	try {
		return await this.helpers.request(options);
	} catch (error) {
		const description = error?.response?.headers['x-bamboohr-error-messsage'] || '';
		const message = error?.message || '';
		throw new NodeApiError(this.getNode(), error as JsonObject, { message, description });
	}
}
