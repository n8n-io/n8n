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
			displayName: 'Advanced Configuration',
			name: 'advancedConfiguration',
			type: 'boolean',
			default: false,
			description: 'Whether to configure custom SSH2 algorithms',
		},
		{
			displayName: 'Encryption Ciphers',
			name: 'algorithmsCiphers',
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					advancedConfiguration: [true],
				},
			},
			placeholder: 'e.g. aes128-ctr,aes192-ctr,aes256-ctr',
			hint: 'Optional comma-separated list of cipher algorithms. Leave empty to use defaults.',
			description:
				'Symmetric cipher algorithms for payload encryption. Common values: aes128-ctr, aes192-ctr, aes256-ctr, aes256-gcm@openssh.com',
		},
		{
			displayName: 'Compression Algorithms',
			name: 'algorithmsCompression',
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					advancedConfiguration: [true],
				},
			},
			placeholder: 'e.g. zlib@openssh.com,zlib,none',
			hint: 'Optional comma-separated list of compression algorithms. Leave empty to use defaults.',
			description:
				'Compression algorithms for the connection. Common values: zlib@openssh.com, zlib, none',
		},
		{
			displayName: 'HMAC Algorithms',
			name: 'algorithmsHmac',
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					advancedConfiguration: [true],
				},
			},
			placeholder: 'e.g. hmac-sha2-256,hmac-sha2-512',
			hint: 'Optional comma-separated list of HMAC algorithms. Leave empty to use defaults.',
			description:
				'Message authentication code algorithms. Common values: hmac-sha2-256, hmac-sha2-512, hmac-sha1',
		},
		{
			displayName: 'Key Exchange Algorithms',
			name: 'algorithmsKex',
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					advancedConfiguration: [true],
				},
			},
			placeholder: 'e.g. ecdh-sha2-nistp256,diffie-hellman-group14-sha256',
			hint: 'Optional comma-separated list of key exchange algorithms. Leave empty to use defaults.',
			description:
				'Key exchange algorithms for establishing the connection. Common values: ecdh-sha2-nistp256, diffie-hellman-group14-sha256',
		},
		{
			displayName: 'Server Host Key Formats',
			name: 'algorithmsServerHostKey',
			// eslint-disable-next-line n8n-nodes-base/cred-class-field-type-options-password-missing
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					advancedConfiguration: [true],
				},
			},
			placeholder: 'e.g. ssh-ed25519,ecdsa-sha2-nistp256,rsa-sha2-256',
			hint: 'Optional comma-separated list of server host key formats. Leave empty to use defaults.',
			description:
				'Server host key signature formats. Common values: ssh-ed25519, ecdsa-sha2-nistp256, rsa-sha2-256, ssh-rsa',
		},
	];
}
