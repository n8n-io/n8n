import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

export class AlienVaultApi implements ICredentialType {
	name = 'alienVaultApi';

	displayName = 'AlienVault API';

	documentationUrl = 'alienvault';

	icon: Icon = 'file:icons/AlienVault.png';

	httpRequestNode = {
		name: 'AlienVault',
		docsUrl: 'https://otx.alienvault.com/api',
		apiBaseUrl: 'https://otx.alienvault.com/api/v1/',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'OTX Key',
			name: 'accessToken',
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
				'X-OTX-API-KEY': '={{$credentials.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://otx.alienvault.com',
			url: '/api/v1/user/me',
		},
	};
}
