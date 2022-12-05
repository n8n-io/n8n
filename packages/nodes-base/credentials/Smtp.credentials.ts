import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class Smtp implements ICredentialType {
	name = 'smtp';

	displayName = 'SMTP';

	documentationUrl = 'smtp';

	properties: INodeProperties[] = [
		{
			displayName: 'User',
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
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Port',
			name: 'port',
			type: 'number',
			default: 465,
		},
		{
			displayName: 'SSL/TLS',
			name: 'secure',
			type: 'boolean',
			default: true,
		},
	];
}
