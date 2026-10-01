import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class InventoryApi implements ICredentialType {
	name = 'inventoryApi';

	displayName = 'Inventory API';

	icon: Icon = 'file:../nodes/Inventory/inventory.svg';

	documentationUrl = 'https://example.com/n8n-nodes-inventory#credentials';

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
				Authorization: '=ApiKey {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: { baseURL: 'http://127.0.0.1:18090/inventory/v1', url: '/me' },
	};
}
