import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SeafileApi implements ICredentialType {
	name = 'seafileApi';
	displayName = 'Seafile API';
	//documentationUrl = 'https://seafile-api.readme.io/';
	properties: INodeProperties[] = [
		{
			displayName: 'Seafile Server URL',
			name: 'domain',
			type: 'string',
			default: '',
			description: 'The hostname of your Seafile Server.',
			placeholder: 'https://your-seafile-server-domain',
		},
		{
			displayName: 'Account Token',
			name: 'token',
			type: 'string',
			description:
				'The Account-Token of a Seafile account you would like to use with n8n. This n8n node does not support an API-/Repo-Token.',
			typeOptions: { password: true },
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '={{"Token " + $credentials.token}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.domain }}',
			url: '/api2/auth/ping/',
			headers: {
				Authorization: '={{"Token " + $credentials.token}}',
			},
		},
	};
}
