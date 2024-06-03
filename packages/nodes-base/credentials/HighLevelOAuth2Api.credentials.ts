import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class HighLevelOAuth2Api implements ICredentialType {
	name = 'highLevelOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'HighLevel OAuth2 API';

	documentationUrl = 'highLevel';

	icon = 'file:icons/highLevel.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'options',
			default: 'https://marketplace.leadconnectorhq.com/oauth/chooselocation',
			required: true,
			options: [
				{
					name: 'White-Label',
					value: 'https://marketplace.leadconnectorhq.com/oauth/chooselocation',
				},
				{
					name: 'Standard',
					value: 'https://marketplace.gohighlevel.com/oauth/chooselocation',
				},
			],
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'string',
			hint: "Separate scopes by space, scopes needed for node: 'locations.readonly contacts.readonly contacts.write opportunities.readonly opportunities.write users.readonly'",
			default: '',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://services.leadconnectorhq.com/oauth/token',
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
			default: 'body',
		},
	];
}
