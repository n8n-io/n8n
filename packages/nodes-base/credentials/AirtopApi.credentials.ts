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
				'The Airtop API key. You can create one at <a href="https://portal.airtop.ai/api-keys" target="_blank">Airtop</a> for free.',
			required: true,
			typeOptions: {
				password: true,
			},
			noDataExpression: true,
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
