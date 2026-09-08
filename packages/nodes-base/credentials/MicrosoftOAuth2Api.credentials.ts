import type { ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

export class MicrosoftOAuth2Api implements ICredentialType {
	name = 'microsoftOAuth2Api';

	extends = ['oAuth2Api'];

	icon: Icon = 'file:icons/Microsoft.svg';

	displayName = 'Microsoft OAuth2 API';

	documentationUrl = 'microsoft';

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authentication',
			name: 'clientCredentialType',
			type: 'options',
			options: [
				{
					name: 'Client Secret',
					value: 'clientSecret',
				},
				{
					name: 'Certificate',
					value: 'certificate',
				},
			],
			default: 'clientSecret',
			description:
				'How n8n authenticates to Microsoft Entra when exchanging and refreshing tokens. Certificate signs a client assertion (private_key_jwt) instead of sending a client secret.',
		},
		// Overrides the `clientSecret` inherited from `oAuth2Api` so it only shows
		// (and is only required) when using shared-secret authentication.
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			displayOptions: {
				show: {
					clientCredentialType: ['clientSecret'],
				},
			},
		},
		{
			displayName: 'Private Key',
			name: 'privateKey',
			type: 'string',
			typeOptions: {
				password: true,
				rows: 4,
			},
			default: '',
			required: true,
			displayOptions: {
				show: {
					clientCredentialType: ['certificate'],
				},
			},
			description:
				'PEM-encoded RSA private key paired with the certificate uploaded to the Entra app registration. Use the multiline editor, in standard PEM format:<br />-----BEGIN PRIVATE KEY-----<br />KEY DATA GOES HERE<br />-----END PRIVATE KEY-----',
		},
		{
			displayName: 'Certificate',
			name: 'certificate',
			type: 'string',
			typeOptions: {
				password: true,
				rows: 4,
			},
			default: '',
			required: true,
			displayOptions: {
				show: {
					clientCredentialType: ['certificate'],
				},
			},
			description:
				'PEM-encoded public certificate registered on the Entra app registration (Certificates & secrets). Used to derive the x5t thumbprint that tells Entra which key verifies the assertion.',
		},
		// Info about the tenantID
		// https://docs.microsoft.com/en-us/azure/active-directory/develop/active-directory-v2-protocols#endpoints
		// Endpoints `/common` can only be used for multitenant apps
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'string',
			default: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'string',
			default: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: 'response_mode=query&prompt=select_account',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
		{
			displayName: 'Microsoft Graph API Base URL',
			name: 'graphApiBaseUrl',
			type: 'options',
			options: [
				{ name: 'Global (https://graph.microsoft.com)', value: 'https://graph.microsoft.com' },
				{ name: 'US Government (https://graph.microsoft.us)', value: 'https://graph.microsoft.us' },
				{
					name: 'US Government DOD (https://dod-graph.microsoft.us)',
					value: 'https://dod-graph.microsoft.us',
				},
				{
					name: 'China (https://microsoftgraph.chinacloudapi.cn)',
					value: 'https://microsoftgraph.chinacloudapi.cn',
				},
			],
			default: 'https://graph.microsoft.com',
			description: 'Select the endpoint for your Microsoft cloud environment.',
		},
	];
}
