import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class HighLevelApi implements ICredentialType {
	name = 'highLevelApi';
	displayName = 'HighLevel API';
	documentationUrl = 'highLevel';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=bearer {{$credentials?.apiKey}}',
			},
		},
	};
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://rest.gohighlevel.com/v1',
			url: '/timezones/',
		},
	};
}
