import { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class AdaloApi implements ICredentialType {
	name = 'adaloApi';
	displayName = 'Adalo API';
	documentationUrl = 'adalo';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'The Adalo API is available on paid Adalo plans, find more information <a href="https://help.adalo.com/integrations/the-adalo-api" target="_blank">here</a>',
		},
		{
			displayName: 'App ID',
			name: 'appId',
			type: 'string',
			default: '',
			description:
				'You can get App ID from the URL of your app. For example, if your app URL is <strong>https://app.adalo.com/apps/1234567890/screens</strong>, then your App ID is <strong>1234567890</strong>.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};
}
