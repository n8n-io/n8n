import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class FortiGateApi implements ICredentialType {
	name = 'fortiGateApi';

	displayName = 'Fortinet FortiGate API';

	documentationUrl = 'fortigate';

	icon = 'file:icons/Fortinet.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			qs: {
				access_token: '={{$credentials.accessToken}}',
			},
		},
	};
}
