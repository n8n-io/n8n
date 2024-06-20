import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class KoBoToolboxApi implements ICredentialType {
	name = 'koBoToolboxApi';

	displayName = 'KoBoToolbox API Token';

	// See https://support.kobotoolbox.org/api.html
	documentationUrl = 'koBoToolbox';

	properties: INodeProperties[] = [
		{
			displayName: 'API Root URL',
			name: 'URL',
			type: 'string',
			default: 'https://kf.kobotoolbox.org/',
		},
		{
			displayName: 'API Token',
			name: 'token',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			hint: 'You can get your API token at https://[api-root]/token/?format=json (for a logged in user)',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Token {{$credentials.token}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.URL}}',
			url: '/api/v2/assets/',
			method: 'GET',
		},
	};
}
