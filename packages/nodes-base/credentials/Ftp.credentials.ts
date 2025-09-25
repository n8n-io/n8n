import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class Ftp implements ICredentialType {
	name = 'ftp';

	displayName = 'FTP';

	documentationUrl = 'ftp';

	properties: INodeProperties[] = [
		{
			displayName: 'Host',
			name: 'host',
			required: true,
			type: 'string',
			default: '',
			placeholder: 'n8n-1-trui.onrender.com',
		},
		{
			displayName: 'Port',
			name: 'port',
			required: true,
			type: 'number',
			default: 21,
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
	];
}
