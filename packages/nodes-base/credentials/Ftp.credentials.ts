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
			displayName: 'Max Concurrent Handshakes',
			name: 'maxConcurrentHandshakes',
			type: 'number',
			default: 5,
			typeOptions: {
				minValue: 1,
				maxValue: 32,
			},
			description:
				'Cap on parallel FTP connections to this server. Lower if you see handshake timeouts under load. Default 5 works for most servers.',
		},
	];
}
