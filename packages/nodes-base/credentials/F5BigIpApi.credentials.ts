import type { IAuthenticateGeneric, ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

export class F5BigIpApi implements ICredentialType {
	name = 'f5BigIpApi';

	displayName = 'F5 Big-IP API';

	documentationUrl = 'f5bigip';

	icon: Icon = 'file:icons/F5.svg';

	httpRequestNode = {
		name: 'F5 Big-IP',
		docsUrl: 'https://clouddocs.f5.com/api/',
		apiBaseUrl: '',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
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
