import type {
	IAuthenticateGeneric,
	ICredentialType,
	ICredentialTestRequest,
	INodeProperties,
} from 'n8n-workflow';

export class AirtopApi implements ICredentialType {
	name = 'airtopApi';

	displayName = 'Airtop API';

	documentationUrl = 'airtop';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
			description:
				'The Airtop API key. You can create one in the <a href="https://portal.airtop.ai/api-keys" target="_blank">Airtop Portal</a>',
			required: true,
			typeOptions: {
				password: true,
			},
			noDataExpression: true,
			hint: "Don't have an Airtop account? <a href='https://portal.airtop.ai/sign-up' target='_blank'>Sign up</a> and start for free.",
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
				'api-key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			method: 'GET',
			baseURL: 'https://api.airtop.ai/api/v1',
			url: '/sessions',
			qs: {
				limit: 10,
			},
		},
	};
}
