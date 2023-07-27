import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class TrellixEpoApi implements ICredentialType {
	name = 'trellixEpoApi';

	displayName = 'Trellix (McAfee) ePolicy Orchestrator API';

	icon = 'file:icons/Trellix.svg';

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
