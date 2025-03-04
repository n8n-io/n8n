/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
	ApplicationError,
	type ICredentialDataDecryptedObject,
	type ICredentialType,
	type IHttpRequestOptions,
	type INodeProperties,
} from 'n8n-workflow';

import {
	getAuthorizationTokenUsingMasterKey,
	HeaderConstants,
} from '../nodes/Microsoft/CosmosDB/GenericFunctions';

export class MicrosoftCosmosDbSharedKeyApi implements ICredentialType {
	name = 'microsoftCosmosDbSharedKeyApi';

	displayName = 'Cosmos DB API';

	documentationUrl = 'microsoftCosmosDb';

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
		if (requestOptions.qs) {
			for (const [key, value] of Object.entries(requestOptions.qs)) {
				if (value === undefined) {
					delete requestOptions.qs[key];
				}
			}
		}

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

		let url;
		if (requestOptions.url) {
			url = new URL(requestOptions.baseURL + requestOptions.url);
			//@ts-ignore
		} else if (requestOptions.uri) {
			//@ts-ignore
			url = new URL(requestOptions.uri);
		}

		const pathSegments = url?.pathname.split('/').filter((segment) => segment);
		let resourceType = '';
		let resourceId = '';

		if (pathSegments?.includes('docs')) {
			const docsIndex = pathSegments.lastIndexOf('docs');
			resourceType = 'docs';
			if (pathSegments[docsIndex + 1]) {
				const docsId = pathSegments[docsIndex + 1];
				resourceId = pathSegments.slice(0, docsIndex).join('/') + `/docs/${docsId}`;
			} else {
				resourceId = pathSegments.slice(0, docsIndex).join('/');
			}
		} else if (pathSegments?.includes('colls')) {
			const collsIndex = pathSegments.lastIndexOf('colls');
			resourceType = 'colls';
			if (pathSegments[collsIndex + 1]) {
				const collId = pathSegments[collsIndex + 1];
				resourceId = pathSegments.slice(0, collsIndex).join('/') + `/colls/${collId}`;
			} else {
				resourceId = pathSegments.slice(0, collsIndex).join('/');
			}
		} else if (pathSegments?.includes('dbs')) {
			const dbsIndex = pathSegments.lastIndexOf('dbs');
			resourceType = 'dbs';
			resourceId = pathSegments.slice(0, dbsIndex + 2).join('/');
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

			requestOptions.headers[HeaderConstants.AUTHORIZATION] = encodeURIComponent(authToken);
			await new Promise((resolve) => setTimeout(resolve, 500));
		}

		return requestOptions;
	}
}
