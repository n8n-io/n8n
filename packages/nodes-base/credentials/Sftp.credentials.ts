import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class Sftp implements ICredentialType {
	name = 'sftp';

	displayName = 'SFTP';

	documentationUrl = 'ftp';

	properties: INodeProperties[] = [
		{
			displayName: 'Host',
			name: 'host',
			required: true,
			type: 'string',
			default: '',
		},
		{
			displayName: 'Port',
			name: 'port',
			required: true,
			type: 'number',
			default: 22,
		},
		{
			displayName: 'Username',
			name: 'username',
			required: true,
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
			displayName: 'Private Key',
			name: 'privateKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'String that contains a private key for either key-based or hostbased user authentication (OpenSSH format)',
		},
		{
			displayName: 'Passphrase',
			name: 'passphrase',
			typeOptions: {
				password: true,
			},
			type: 'string',
			default: '',
			description: 'For an encrypted private key, this is the passphrase used to decrypt it',
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
				'Cap on parallel SSH handshakes to this server. Lower if you see handshake timeouts under load. Default 5 works for most servers.',
		},
	];
}
