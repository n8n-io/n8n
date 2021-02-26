import {
	OptionsWithUri,
 } from 'request';

import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

export async function apiTemplateIoApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	qs = {},
	body = {},
	) {
	const { apiKey } = this.getCredentials('apiTemplateIoApi') as { apiKey: string };

	const options: OptionsWithUri = {
		headers: {
			'user-agent': 'n8n',
			Accept: 'application/json',
			'X-API-KEY': `${apiKey}`,
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
		console.log(JSON.stringify(options, null, 2));
		return await this.helpers.request!(options);
	} catch (error) {
		if (error?.response?.body?.message) {
			throw new Error(`APITemplate.io error response [${error.statusCode}]: ${error.response.body.message}`);
		}
		throw error;
	}
}

export async function loadResource(
	this: ILoadOptionsFunctions,
	resource: 'image' | 'pdf',
) {
	const target = resource === 'image' ? ['JPEG', 'PNG'] : ['PDF'];
	const templates = await apiTemplateIoApiRequest.call(this, 'GET', '/list-templates');
	const filtered = templates.filter(({ format }: { format: 'PDF' | 'JPEG' | 'PNG' }) => target.includes(format));

	return filtered.map(({ format, name, id }: { format: string, name: string, id: string }) => ({
		name: `${name} (${format})`,
		value: id,
	}));
}

export type GroupsOfKeyValuePairs = {
	data: [
		{
			json: {
				data: Array<{ key: string, value: string }>
			}
		}
	]
};

export type Overrides = {
	overrides: Array<{ [key: string]: string }>
};
