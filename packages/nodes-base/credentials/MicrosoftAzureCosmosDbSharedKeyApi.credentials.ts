import { createHmac } from 'crypto';
import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { OperationalError } from 'n8n-workflow';

import {
	CURRENT_VERSION,
	HeaderConstants,
	RESOURCE_TYPES,
} from '../nodes/Microsoft/CosmosDb/helpers/constants';

export class MicrosoftAzureCosmosDbSharedKeyApi implements ICredentialType {
	name = 'microsoftAzureCosmosDbSharedKeyApi';

	displayName = 'Azure Cosmos DB API';

	documentationUrl = 'microsoftAzureCosmosDb';

	properties: INodeProperties[] = [
		{
			displayName: 'Account',
			name: 'account',
			default: '',
			description: 'Account name',
			required: true,
			type: 'string',
		},
		{
			displayName: 'Key',
			name: 'key',
			default: '',
			description: 'Account key',
			required: true,
			type: 'string',
			typeOptions: {
				password: true,
			},
		},
		{
			displayName: 'Database',
			name: 'database',
			default: '',
			description: 'Database name',
			required: true,
			type: 'string',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			default: '=https://{{ $self["account"] }}.documents.azure.com/dbs/{{ $self["database"] }}',
			type: 'hidden',
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		// if (requestOptions.qs) {
		// 	for (const [key, value] of Object.entries(requestOptions.qs)) {
		// 		if (value === undefined) {
		// 			delete requestOptions.qs[key];
		// 		}
		// 	}
		// }
		// if (requestOptions.headers) {
		// 	for (const [key, value] of Object.entries(requestOptions.headers)) {
		// 		if (value === undefined) {
		// 			delete requestOptions.headers[key];
		// 		}
		// 	}
		// }

		const date = new Date().toUTCString();

		requestOptions.headers ??= {};
		requestOptions.headers = {
			...requestOptions.headers,
			'x-ms-date': date,
			'x-ms-version': CURRENT_VERSION,
			'Cache-Control': 'no-cache',
		};

		const url = new URL(requestOptions.baseURL + requestOptions.url);
		const pathSegments = url.pathname.split('/').filter(Boolean);

		const foundResource = RESOURCE_TYPES.map((type) => ({
			type,
			index: pathSegments.lastIndexOf(type),
		}))
			.filter(({ index }) => index !== -1)
			.sort((a, b) => b.index - a.index)
			.shift();

		if (!foundResource) {
			throw new OperationalError('Unable to determine the resource type from the URL');
		}

		const { type, index } = foundResource;
		const resourceId =
			pathSegments[index + 1] !== undefined
				? `${pathSegments.slice(0, index).join('/')}/${type}/${pathSegments[index + 1]}`
				: pathSegments.slice(0, index).join('/');

		const key = Buffer.from(credentials.key as string, 'base64');
		const payload = `${(requestOptions.method ?? 'GET').toLowerCase()}\n${type.toLowerCase()}\n${resourceId}\n${date.toLowerCase()}\n\n`;
		const hmacSha256 = createHmac('sha256', key);
		const signature = hmacSha256.update(payload, 'utf8').digest('base64');

		requestOptions.headers[HeaderConstants.AUTHORIZATION] = encodeURIComponent(
			`type=master&ver=1.0&sig=${signature}`,
		);

		return requestOptions;
	}
}
