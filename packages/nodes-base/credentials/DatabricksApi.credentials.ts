import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class DatabricksApi implements ICredentialType {
	name = 'databricksApi';

	displayName = 'Databricks API';

	documentationUrl = 'databricks';

	properties: INodeProperties[] = [
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: '',
			placeholder: 'https://adb-1234567890123456.7.azuredatabricks.net',
			description: 'The workspace URL without a trailing slash',
		},
		{
			displayName: 'Access Token',
			name: 'token',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'A Databricks personal access token (PAT)',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.token}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.host}}',
			url: '/api/2.0/sql/warehouses',
		},
	};
}
