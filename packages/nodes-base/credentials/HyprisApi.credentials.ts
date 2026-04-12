import { IAuthenticateGeneric, ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

export class HyprisApi implements ICredentialType {
	name = 'hyprisApi';
	displayName = 'Hypris API';
	icon = 'file:hypris.svg' as Icon;
	documentationUrl = 'https://docs.n8n.io/integrations/credentials/hypris/';
	properties: INodeProperties[] = [
		{
			displayName: 'User ID',
			name: 'user',
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
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			auth: {
				username: '={{$credentials.user}}',
				password: '={{$credentials.password}}',
			},
		},
	};
}
