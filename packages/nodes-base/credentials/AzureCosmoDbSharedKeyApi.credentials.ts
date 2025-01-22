import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

import { getAuthorizationTokenUsingMasterKey } from '../nodes/Microsoft/AzureCosmoDb/GenericFunctions';

export class AzureCosmoDbSharedKeyApi implements ICredentialType {
	name = 'azureCosmoDbSharedKeyApi';

	displayName = 'Azure Cosmo DB API';

	documentationUrl = 'azureCosmoDb';

	properties: INodeProperties[] = [
		{
			displayName: 'Database',
			name: 'database',
			description: 'Database name',
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

		if (!requestOptions.method) {
			if (requestOptions.body) {
				if (requestOptions.body.hasOwnProperty('colls')) {
					requestOptions.method = 'POST';
				} else if (requestOptions.body.hasOwnProperty('docs')) {
					requestOptions.method = 'POST';
				} else if (requestOptions.body.hasOwnProperty('update')) {
					requestOptions.method = 'PATCH';
				} else if (requestOptions.body.hasOwnProperty('delete')) {
					requestOptions.method = 'DELETE';
				}
			} else {
				requestOptions.method = 'GET';
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

		if (requestOptions.body) {
			if (requestOptions.body.hasOwnProperty('colls')) {
				resourceType = 'dbs';
				resourceLink = `dbs/${credentials.database}/colls`;
			} else if (requestOptions.body.hasOwnProperty('docs')) {
				resourceType = 'colls';
				const collId = requestOptions.body.collId || '';
				resourceLink = `dbs/${credentials.database}/colls/${collId}/docs`;
			}
		} else if (requestOptions.qs) {
			if (requestOptions.qs.queryType === 'colls') {
				resourceType = 'dbs';
				resourceLink = `dbs/${credentials.database}/colls`;
			} else if (requestOptions.qs.queryType === 'docs') {
				resourceType = 'colls';
				const collId = requestOptions.qs.collId || '';
				resourceLink = `dbs/${credentials.database}/colls/${collId}/docs`;
			}
		}

		// Generate authorization token using the master key
		const authToken = getAuthorizationTokenUsingMasterKey(
			requestOptions.method,
			resourceType,
			resourceLink,
			date,
			credentials.key as string,
		);

		requestOptions.headers.authorization = authToken;

		return requestOptions;
	}
}
