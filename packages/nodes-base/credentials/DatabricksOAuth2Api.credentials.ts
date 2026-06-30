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
		{
			// Re-declared because the base `oAuth2Api` field is `doNotInherit`, so it
			// never reaches the decrypted credential. Without it the value is always
			// undefined and token refresh is hardcoded to 401 — workspaces fronted by
			// a proxy that rewrites 401 to 403 can set 403 here to keep refreshing.
			displayName: 'Token Expired Status Code',
			name: 'tokenExpiredStatusCode',
			type: 'number',
			default: 401,
			description:
				'HTTP status code that indicates the token has expired. Some APIs return 403 instead of 401.',
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
