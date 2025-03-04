import { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class BrowserflowApi implements ICredentialType {
	name = 'browserflowApi';
	displayName = 'Browserflow API';
	documentationUrl = 'https://docs.browserflow.io/api'; // Replace with the actual documentation URL
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			description:
				'You can get an API key for free by signing up for the 7-day trial at https://browserflow.io?tool=n8n',
			type: 'string',
			typeOptions: {
				password: true, // This hides the API key in the UI
			},
			default: '',
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
