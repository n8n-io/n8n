import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class NpmApi implements ICredentialType {
	name = 'npmApi';

	displayName = 'Npm API';

	documentationUrl = 'npm';

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'Registry Url',
			name: 'registryUrl',
			type: 'string',
			default: 'https://registry.npmjs.org',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.registryUrl}}',
			url: '/-/whoami',
		},
	};
}
