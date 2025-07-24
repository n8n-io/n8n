import type {
	IAuthenticateGeneric,
	ICredentialType,
	ICredentialTestRequest,
	INodeProperties,
} from 'n8n-workflow';

import { BASE_URL } from '../nodes/Airtop/constants';

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
		{
			displayName: 'API URL',
			name: 'apiUrl',
			type: 'string',
			default: '',
			description: 'The base URL for the Airtop API. Leave empty to use the default.',
			placeholder: 'https://api.airtop.ai/api/v1',
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
			baseURL: '={{$credentials.apiUrl || "' + BASE_URL + '"}}',
			url: '/sessions',
			qs: {
				limit: 10,
			},
		},
	};
}
