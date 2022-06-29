import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class HighLevelOAuth2Api implements ICredentialType {
	name = 'highLevelOAuth2Api';
	displayName = 'HighLevel OAuth2 API';
	documentationUrl = 'highLevel';
	extends = [
		'oAuth2Api',
	];
	properties: INodeProperties[] = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://marketplace.gohighlevel.com/oauth/chooselocation',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://api.msgsndr.com/oauth/token',
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
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'contacts.readonly contacts.write',
		},
	];
}
