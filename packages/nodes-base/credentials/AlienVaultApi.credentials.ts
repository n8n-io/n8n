import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class AlienVaultApi implements ICredentialType {
	name = 'alienVaultApi';

	displayName = 'AlienVault API';

	icon = 'file:icons/AlienVault.png';

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
