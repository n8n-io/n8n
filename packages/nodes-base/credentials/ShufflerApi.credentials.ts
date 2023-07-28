import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ShufflerApi implements ICredentialType {
	name = 'shufflerApi';

	displayName = 'Shuffler API';

	icon = 'file:icons/Shuffler.svg';

	documentationUrl = 'shuffler';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
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

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://shuffler.io/api',
			url: '/v1/users/getusers',
			method: 'GET',
		},
	};
}
