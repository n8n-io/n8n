import type { OptionsWithUri } from 'request';

import type { IExecuteFunctions, ILoadOptionsFunctions, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function apiTemplateIoApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	qs = {},
	body = {},
) {
	const options: OptionsWithUri = {
		headers: {
			'user-agent': 'n8n',
			Accept: 'application/json',
		},
		uri: `https://api.apitemplate.io/v1${endpoint}`,
		method,
		qs,
		body,
		followRedirect: true,
		followAllRedirects: true,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	try {
		const response = await this.helpers.requestWithAuthentication.call(
			this,
			'apiTemplateIoApi',
			options,
		);
		if (response.status === 'error') {
			throw new NodeApiError(this.getNode(), response.message as JsonObject);
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

export function validateJSON(json: string | object | undefined): any {
	let result;
	if (typeof json === 'object') {
		return json;
	}
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = undefined;
	}
	return result;
}

export async function downloadImage(this: IExecuteFunctions, url: string) {
	return this.helpers.request({
		uri: url,
		method: 'GET',
		json: false,
		encoding: null,
	});
}
