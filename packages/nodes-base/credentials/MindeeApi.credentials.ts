import type {
	Icon,
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MindeeApi implements ICredentialType {
	name = 'mindeeApi';

	displayName = 'Mindee API (V2)';
	icon: Icon = 'file:icons/Mindee.svg';
	documentationUrl = 'mindee';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				Authorization: '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api-v2.mindee.net/v2',
			url: '/search/models',
			qs: {
				per_page: 1,
			},
		},
	};
}
