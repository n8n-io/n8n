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
			placeholder: 'localhost',
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
		{
			displayName: 'Force PASV',
			name: 'forcePasv',
			type: 'boolean',
			default: false,
			description:
				'Whether to use PASV instead of EPSV for FTP data connections. Enable this for servers that advertise EPSV but do not support it.',
		},
	];
}
