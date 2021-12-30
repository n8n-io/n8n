import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ZammadBasicApi implements ICredentialType {
	name = 'zammadBasicApi';
	displayName = 'Zammad Basic API';
	documentationUrl = 'zammad';
	properties: INodeProperties[] = [
		{
			displayName: 'Domain',
			name: 'domain',
			type: 'string',
			default: 'https://n8n.zammad.com',
			required: true,
		},
		{
			displayName: 'User Name',
			name: 'username',
			description: 'Email also allowed',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
		},
		{
			displayName: 'Ignore SSL Issues',
			name: 'allowUnauthorizedCerts',
			type: 'boolean',
			default: false,
		},
	];
}
