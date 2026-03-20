import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class DatabricksApi implements ICredentialType {
	name = 'databricksApi';
	displayName = 'Databricks';
	documentationUrl = 'https://docs.databricks.com/dev-tools/api/latest/authentication.html';
	icon = 'file:icons/databricks.svg' as const;
	properties: INodeProperties[] = [
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: '',
			placeholder: 'https://adb-xxxxx.xx.azure.databricks.com',
			required: true,
			description: 'Domain of your Databricks workspace',
		},
		{
			displayName: 'Personal Access Token',
			name: 'token',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			placeholder: 'dapixxxxxxxxxxxxxxxxxxxxxx',
			required: true,
			description: 'Databricks personal access token',
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
			url: '/api/2.0/preview/scim/v2/Me',
			method: 'GET',
		},
	};
}
