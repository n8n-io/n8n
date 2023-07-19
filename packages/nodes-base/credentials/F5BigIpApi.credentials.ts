import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class F5BigIpApi implements ICredentialType {
	name = 'f5BigIpApi';

	displayName = 'F5 Big-IP API';

	icon = 'file:icons/icons/F5.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			auth: {
				username: '={{$credentials.username}}',
				password: '={{$credentials.password}}',
			},
		},
	};
}
