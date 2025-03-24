import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class SupadataApi implements ICredentialType {
	name = 'supadataApi';

	displayName = 'Supadata API';

	documentationUrl = 'https://supadata.ai/documentation/getting-started';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			placeholder: 'Enter your Supadata API Key',
			required: true,
		},
	];

	authenticate = {
		type: 'generic',
		properties: {
			qs: {
				'x-api-key': '={{$credentials.apiKey}}',
			},
		},
	} as const;

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.supadata.ai/v1',
			url: '/ping',
			qs: {
				'x-api-key': '={{$credentials.apiKey}}',
			},
		},
	};
}
