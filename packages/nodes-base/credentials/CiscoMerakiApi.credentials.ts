import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class CiscoMerakiApi implements ICredentialType {
	name = 'ciscoMerakiApi';

	displayName = 'Cisco Meraki API';

	icon = 'file:icons/Cisco.svg';

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
