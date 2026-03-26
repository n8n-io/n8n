import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class DatabricksOAuth2Api implements ICredentialType {
	name = 'databricksOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Databricks OAuth2 API';

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
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'clientCredentials',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: '={{$self["host"]}}/oidc/v1/token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'all-apis',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.host}}',
			url: '/api/2.0/preview/scim/v2/Me',
			method: 'GET',
		},
	};
}
