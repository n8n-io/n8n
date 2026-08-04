import type {
	IAuthenticate,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class NetlifyApi implements ICredentialType {
	name = 'netlifyApi';

	displayName = 'Netlify API';

	documentationUrl = 'netlify';

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	authenticate: IAuthenticate = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.netlify.com',
			url: '/api/v1/sites',
		},
	};
}
