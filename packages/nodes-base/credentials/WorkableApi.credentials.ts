import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class WorkableApi implements ICredentialType {
	name = 'workableApi';

	displayName = 'Workable API';

	documentationUrl = 'workable';

	properties: INodeProperties[] = [
		{
			displayName: 'Subdomain',
			name: 'subdomain',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
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
			baseURL: '=https://{{$credentials.subdomain}}.workable.com/spi/v3',
			url: '/jobs',
		},
	};
}
