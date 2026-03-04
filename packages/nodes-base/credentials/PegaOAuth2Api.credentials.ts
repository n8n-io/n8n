import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class PegaOAuth2Api implements ICredentialType {
	name = 'pegaOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Pega OAuth2 API';

	documentationUrl =
		'https://docs.pega.com/bundle/launchpad/page/platform/launchpad/configure-oauth2-authentication-profile.html';

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'clientCredentials',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'string',
			default: '',
			placeholder: 'https://<your-pega-domain>/prweb/PRRestService/oauth2/v1/token',
			required: true,
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'string',
			default: '',
			description: 'Optional: Specify the OAuth2 scope for your Pega API access',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
	];
}
