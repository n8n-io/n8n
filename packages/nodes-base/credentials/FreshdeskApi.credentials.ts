import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class FreshdeskApi implements ICredentialType {
	name = 'freshdeskApi';

	displayName = 'Freshdesk API';

	documentationUrl = 'freshdesk';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'Domain',
			name: 'domain',
			type: 'string',
			placeholder: 'company',
			description:
				'If the URL you get displayed on Freshdesk is "https://company.freshdesk.com" enter "company"',
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			auth: {
				username: '={{$credentials.apiKey}}',
				password: 'X',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '=https://{{$credentials.domain}}.freshdesk.com/api/v2',
			url: '/agents/me',
		},
	};
}
