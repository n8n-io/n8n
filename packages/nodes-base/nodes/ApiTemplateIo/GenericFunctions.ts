import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { jsonParse, NodeApiError } from 'n8n-workflow';

export async function apiTemplateIoApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	qs: IDataObject = {},
	body: IDataObject = {},
) {
	const options: IHttpRequestOptions = {
		headers: {
			Accept: 'application/json',
		},
		url: `https://api.apitemplate.io/v1${endpoint}`,
		method,
		qs,
		body,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	try {
		const response = await this.helpers.httpRequestWithAuthentication.call(
			this,
			'apiTemplateIoApi',
			options,
		);
		if (response.status === 'error') {
			throw new NodeApiError(this.getNode(), response as JsonObject);
		}
		return response;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function loadResource(this: ILoadOptionsFunctions, resource: 'image' | 'pdf') {
	const target = resource === 'image' ? ['JPEG', 'PNG'] : ['PDF'];
	const templates = await apiTemplateIoApiRequest.call(this, 'GET', '/list-templates');
	const filtered = templates.filter(({ format }: { format: 'PDF' | 'JPEG' | 'PNG' }) =>
		target.includes(format),
	);

	return filtered.map(({ format, name, id }: { format: string; name: string; id: string }) => ({
		name: `${name} (${format})`,
		value: id,
	}));
}

/** Parses user-supplied JSON, returning `undefined` rather than throwing when it is malformed */
export function validateJSON(
	json: string | object | undefined,
): IDataObject | IDataObject[] | undefined {
	if (typeof json === 'object') {
		return json as IDataObject;
	}
	if (json === undefined) {
		return undefined;
	}
	try {
		return jsonParse<IDataObject | IDataObject[]>(json);
	} catch {
		return undefined;
	}
}

export async function downloadImage(this: IExecuteFunctions, url: string) {
	return await this.helpers.httpRequest({
		url,
		method: 'GET',
		json: false,
		encoding: 'arraybuffer',
	});
}

export async function apiTemplateIoApiRequestV2(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	region = 'rest',
	endpoint: string,
	qs: IDataObject = {},
	body: IDataObject = {},
	returnBinary = false,
) {
	const headers: IDataObject = { 'user-agent': 'n8n' };
	const options: IHttpRequestOptions = {
		headers,
		url: `https://${region}.apitemplate.io${endpoint}`,
		method,
		qs,
	};

	if (returnBinary) {
		// The response is a raw file, so keep it as a Buffer and send the body as
		// a pre-serialised string rather than letting the helper parse either side
		headers['Content-Type'] = 'application/json';
		options.json = false;
		options.encoding = 'arraybuffer';
		if (Object.keys(body).length) {
			options.body = JSON.stringify(body);
		}
	} else {
		headers.Accept = 'application/json';
		options.json = true;
		if (Object.keys(body).length) {
			options.body = body;
		}
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	try {
		const response = await this.helpers.httpRequestWithAuthentication.call(
			this,
			'apiTemplateIoApi',
			options,
		);
		if (!returnBinary && response.status === 'error') {
			throw new NodeApiError(this.getNode(), response as JsonObject);
		}
		return response;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
