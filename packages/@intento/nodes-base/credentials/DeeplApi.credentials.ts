import { DeeplDescriptor } from 'intento-translation';
import type { IAuthenticateGeneric, ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class DeeplApi implements ICredentialType {
	name = `${DeeplDescriptor.credentials}`;

	displayName = 'DeepL API';

	documentationUrl = 'deepl';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'The DeepL API authentication key',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			qs: {
				auth_key: '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.deepl.com/v2',
			url: '/usage',
		},
	};
}
