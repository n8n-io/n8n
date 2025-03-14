import {
	ApplicationError,
	type ICredentialDataDecryptedObject,
	type ICredentialType,
	type IHttpRequestOptions,
	type INodeProperties,
} from 'n8n-workflow';

import { getAuthorizationTokenUsingMasterKey } from '../nodes/Microsoft/AzureCosmosDb/generalFunctions/authorization';
import type { IHttpRequestOptionsExtended } from '../nodes/Microsoft/AzureCosmosDb/generalFunctions/helpers';

export class MicrosoftAzureCosmosDbSharedKeyApi implements ICredentialType {
	name = 'microsoftAzureCosmosDbSharedKeyApi';

	displayName = 'Azure Cosmos DB API';

	documentationUrl = 'microsoftAzureCosmosDb';

	properties: INodeProperties[] = [
		{
			displayName: 'Account',
			name: 'account',
			description: 'Account name',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Key',
			name: 'key',
			description: 'Account key',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
		{
			displayName: 'Database',
			name: 'database',
			description: 'Database name',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'hidden',
			default: '=https://{{ $self["account"] }}.documents.azure.com/dbs/{{ $self["database"] }}',
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		Object.keys(requestOptions.qs ?? {}).forEach(
			(key) => requestOptions.qs?.[key] === undefined && delete requestOptions.qs?.[key],
		);

		requestOptions.headers ??= {};

		const date = new Date().toUTCString().toLowerCase();
		requestOptions.headers = {
			...requestOptions.headers,
			'x-ms-date': date,
			'x-ms-version': '2018-12-31',
			'Cache-Control': 'no-cache',
		};

		if (credentials.sessionToken) {
			requestOptions.headers['x-ms-session-token'] = credentials.sessionToken;
		}
		const request = requestOptions as IHttpRequestOptionsExtended;

		let url;
		//Custom node usage
		if (request.url) {
			url = new URL(request.baseURL + request.url);
		}
		//Http Request nodes usage
		else if (request.uri) {
			url = new URL(request.uri);
		}

		const pathSegments = url?.pathname.split('/').filter(Boolean);
		if (!pathSegments) {
			throw new ApplicationError('Invalid URL structure.');
		}

		const resourceTypes = ['docs', 'colls', 'dbs'] as const;
		type ResourceType = (typeof resourceTypes)[number];

		let resourceType: ResourceType | '' = '';
		let resourceId = '';

		const foundResource = resourceTypes
			.map((type) => ({ type, index: pathSegments.lastIndexOf(type) }))
			.filter(({ index }) => index !== -1)
			.sort((a, b) => b.index - a.index)[0];

		if (foundResource) {
			const { type, index } = foundResource;
			resourceType = type;
			resourceId =
				pathSegments[index + 1] !== undefined
					? pathSegments.slice(0, index).join('/') + `/${type}/${pathSegments[index + 1]}`
					: pathSegments.slice(0, index).join('/');
		} else {
			throw new ApplicationError('Unable to determine resourceType and resourceId from the URL.');
		}

		if (requestOptions.method) {
			let authToken = '';

			if (credentials.key) {
				authToken = getAuthorizationTokenUsingMasterKey(
					requestOptions.method,
					resourceType,
					resourceId,
					credentials.key as string,
				);
			}

			requestOptions.headers.AUTHORIZATION = encodeURIComponent(authToken);
			await new Promise((resolve) => setTimeout(resolve, 500));
		}

		return requestOptions;
	}
}
