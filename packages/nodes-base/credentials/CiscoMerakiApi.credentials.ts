import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class CiscoMerakiApi implements ICredentialType {
	name = 'ciscoMerakiApi';

	displayName = 'Cisco Meraki API';

	documentationUrl = 'ciscomeraki';

	icon = { light: 'file:icons/Cisco.svg', dark: 'file:icons/Cisco.dark.svg' } as const;

	httpRequestNode = {
		name: 'Cisco Meraki',
		docsUrl: 'https://developer.cisco.com/meraki/api/',
		apiBaseUrl: 'https://api.meraki.com/api/v1/',
	};

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
				'X-Cisco-Meraki-API-Key': '={{$credentials.apiKey}}',
			},
		},
	};

	// test: ICredentialTestRequest = {
	// 	request: {
	// 		baseURL: 'https://api.meraki.com/api/v1',
	// 		url: '/organizations',
	// 	},
	// };
}
