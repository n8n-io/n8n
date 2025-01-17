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
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '=https://{{ $self["database"] }}.documents.azure.com',
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

		requestOptions.method ??= 'GET';

		requestOptions.headers ??= {};
		const date = new Date().toUTCString();
		requestOptions.headers['x-ms-date'] = date;
		requestOptions.headers['x-ms-version'] = '2020-04-08';

		if (credentials.sessionToken) {
			requestOptions.headers['x-ms-session-token'] = credentials.sessionToken;
		}

		const resourceType = 'dbs';
		const resourceLink = 'dbs/ToDoList';

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
