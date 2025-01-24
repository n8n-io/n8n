import {
	ApplicationError,
	type ICredentialDataDecryptedObject,
	type ICredentialType,
	type IHttpRequestOptions,
	type INodeProperties,
} from 'n8n-workflow';

import { getAuthorizationTokenUsingMasterKey } from '../nodes/Microsoft/AzureCosmosDb/GenericFunctions';

export class AzureCosmosDbSharedKeyApi implements ICredentialType {
	name = 'azureCosmosDbSharedKeyApi';

	displayName = 'Azure Cosmos DB API';

	documentationUrl = 'azureCosmosDb';

	properties: INodeProperties[] = [
		{
			displayName: 'Database',
			name: 'databaseAccount',
			description: 'Database account',
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
		const date = new Date().toUTCString();
		requestOptions.headers = {
			...requestOptions.headers,
			'x-ms-date': date,
			'x-ms-version': '2020-04-08',
		};

		if (credentials.sessionToken) {
			requestOptions.headers['x-ms-session-token'] = credentials.sessionToken;
		}

		let resourceType = '';
		let resourceLink = '';
		if (requestOptions.body && typeof requestOptions.body === 'object') {
			const isCollectionRequest = 'colls' in requestOptions.body;
			const isDocumentRequest = 'docs' in requestOptions.body;

			if (isCollectionRequest) {
				resourceType = 'dbs';
				resourceLink = `dbs/${credentials.database}/colls`;
			} else if (isDocumentRequest) {
				resourceType = 'colls';
				const collId = requestOptions.qs?.collId || '';
				if (!collId) {
					throw new ApplicationError('Collection ID (collId) is required for document requests.');
				}
				resourceLink = `dbs/${credentials.database}/colls/${collId}/docs`;
			}
		} else if (requestOptions.qs && typeof requestOptions.qs === 'object') {
			const queryType = requestOptions.qs.queryType;

			if (queryType === 'colls') {
				resourceType = 'dbs';
				resourceLink = `dbs/${credentials.database}/colls`;
			} else if (queryType === 'docs') {
				resourceType = 'colls';
				const collId = requestOptions.qs.collId || '';
				if (!collId) {
					throw new ApplicationError('Collection ID (collId) is required for document queries.');
				}
				resourceLink = `dbs/${credentials.database}/colls/${collId}/docs`;
			}
		} else {
			throw new ApplicationError(
				'Invalid requestOptions: Either body or query string (qs) is required.',
			);
		}

		if (requestOptions.method) {
			const authToken = getAuthorizationTokenUsingMasterKey(
				requestOptions.method,
				resourceType,
				resourceLink,
				date,
				credentials.key as string,
			);

			requestOptions.headers.authorization = authToken;
		}

		return requestOptions;
	}
}
