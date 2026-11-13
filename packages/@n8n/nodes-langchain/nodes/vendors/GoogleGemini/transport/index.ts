import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	RequestPath,
} from 'n8n-workflow';
import { NodeOperationError, requestPath, requestUrl } from 'n8n-workflow';

type RequestParameters = {
	headers?: IDataObject;
	body?: IDataObject | string;
	qs?: IDataObject;
	returnFullResponse?: boolean;
	allowedDomains?: string;
};

type GooglePalmApiCredentials = {
	host: string;
	apiKey: string;
};

export function resourcePath(name: string): RequestPath {
	return name.split('/').reduce((path, segment) => requestPath`${path}/${segment}`, requestPath``);
}

function namedResourcePath(
	this: IExecuteFunctions,
	name: string,
	collections: string[],
): RequestPath {
	const [collection, id, ...rest] = name.split('/');
	if (!collections.includes(collection) || !id || rest.length > 0) {
		const formats = collections.map((c) => `"${c}/<ID>"`).join(' or ');
		throw new NodeOperationError(this.getNode(), `Invalid resource name "${name}"`, {
			description: `Use the format ${formats}`,
		});
	}
	return requestPath`/${collection}/${id}`;
}

export function modelPath(this: IExecuteFunctions, model: string): RequestPath {
	return namedResourcePath.call(this, model, ['models', 'tunedModels']);
}

export function fileSearchStorePath(this: IExecuteFunctions, name: string): RequestPath {
	return namedResourcePath.call(this, name, ['fileSearchStores']);
}

export async function apiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath | { url: string },
	parameters?: RequestParameters,
) {
	const { body, qs, headers, returnFullResponse, allowedDomains } = parameters ?? {};

	const credentials = await this.getCredentials<GooglePalmApiCredentials>('googlePalmApi');

	const host = credentials.host || 'https://generativelanguage.googleapis.com';
	const options = { headers, method, body, qs, json: true, returnFullResponse, allowedDomains };

	return await this.helpers.httpRequestWithAuthentication.call(
		this,
		'googlePalmApi',
		'url' in endpoint
			? { ...options, url: endpoint.url }
			: { ...options, url: requestUrl`${host}${endpoint}` },
	);
}
