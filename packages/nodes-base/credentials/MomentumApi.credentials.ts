import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class MomentumApi implements ICredentialType {
	name = 'momentumApi';
	displayName = 'Momentum API';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.nowcerts.com/api',
			placeholder: 'https://api.nowcerts.com/api',
		},
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
			typeOptions: {
				password: true,
			},
			default: '',
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
		},
	];
}
