import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	IRequestOptions,
	JsonObject,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, requestPath, requestUrl } from 'n8n-workflow';

/**
 * Return the identity base URL based on the user's environment.
 */
async function getIdentityBaseUrl(this: IExecuteFunctions | ILoadOptionsFunctions) {
	const { environment, domain } = await this.getCredentials('bitwardenApi');

	return environment === 'cloudHosted' ? 'https://identity.bitwarden.com' : `${domain}/identity`;
}

/**
 * Return the base API URL based on the user's environment.
 */
async function getBaseUrl(this: IExecuteFunctions | ILoadOptionsFunctions) {
	const { environment, domain } = await this.getCredentials('bitwardenApi');

	return environment === 'cloudHosted' ? 'https://api.bitwarden.com' : `${domain}/api`;
}

/**
 * Make an authenticated API request to Bitwarden.
 */
export async function bitwardenApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	qs: IDataObject,
	body: IDataObject,
	token: string,
): Promise<any> {
	const baseUrl = await getBaseUrl.call(this);
	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		method,
		qs,
		body,
		uri: requestUrl`${baseUrl}${endpoint}`,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Retrieve the access token needed for every API request to Bitwarden.
 */
export async function getAccessToken(
	this: IExecuteFunctions | ILoadOptionsFunctions,
): Promise<any> {
	const credentials = await this.getCredentials('bitwardenApi');

	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		method: 'POST',
		form: {
			client_id: credentials.clientId,
			client_secret: credentials.clientSecret,
			grant_type: 'client_credentials',
			scope: 'api.organization',
			deviceName: 'n8n',
			deviceType: 2, // https://github.com/bitwarden/server/blob/master/src/Core/Enums/DeviceType.cs
			deviceIdentifier: 'n8n',
		},
		uri: requestUrl`${await getIdentityBaseUrl.call(this)}/connect/token`,
		json: true,
	};

	try {
		const { access_token } = await this.helpers.request(options);
		return access_token;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Supplement a `getAll` operation with `returnAll` and `limit` parameters.
 */
export async function handleGetAll(
	this: IExecuteFunctions,
	i: number,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	qs: IDataObject,
	body: IDataObject,
	token: string,
) {
	const responseData = await bitwardenApiRequest.call(this, method, endpoint, qs, body, token);
	const returnAll = this.getNodeParameter('returnAll', i);

	if (returnAll) {
		return responseData.data;
	} else {
		const limit = this.getNodeParameter('limit', i);
		return responseData.data.slice(0, limit);
	}
}

/**
 * Load a resource so that it can be selected by name from a dropdown.
 */
export async function loadResource(this: ILoadOptionsFunctions, resource: string) {
	const returnData: INodePropertyOptions[] = [];
	const token = await getAccessToken.call(this);
	const endpoint = requestPath`/public/${resource}`;

	const { data } = await bitwardenApiRequest.call(this, 'GET', endpoint, {}, {}, token as string);

	data.forEach(({ id, name, externalId }: { id: string; name: string; externalId?: string }) => {
		returnData.push({
			name: externalId || name || id,
			value: id,
		});
	});

	return returnData;
}
