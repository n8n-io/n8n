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
			displayName: 'Specify Cipher',
			name: 'setCipher',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'Cipher',
			name: 'cipher',
			type: 'options',
			options: [
				{ name: 'chacha20-poly1305@openssh.com', value: 'chacha20-poly1305@openssh.com' },
				{ name: 'aes128-gcm', value: 'aes128-gcm' },
				{ name: 'aes128-gcm@openssh.com', value: 'aes128-gcm@openssh.com' },
				{ name: 'aes256-gcm', value: 'aes256-gcm' },
				{ name: 'aes256-gcm@openssh.com', value: 'aes256-gcm@openssh.com' },
				{ name: 'aes128-ctr', value: 'aes128-ctr' },
				{ name: 'aes192-ctr', value: 'aes192-ctr' },
				{ name: 'aes256-ctr', value: 'aes256-ctr' },
				{ name: '3des-cbc', value: '3des-cbc' },
				{ name: 'aes256-cbc', value: 'aes256-cbc' },
				{ name: 'aes192-cbc', value: 'aes192-cbc' },
				{ name: 'aes128-cbc', value: 'aes128-cbc' },
				{ name: 'arcfour256', value: 'arcfour256' },
				{ name: 'arcfour128', value: 'arcfour128' },
				{ name: 'arcfour', value: 'arcfour' },
				{ name: 'blowfish-cbc', value: 'blowfish-cbc' },
				{ name: 'cast128-cbc', value: 'cast128-cbc' },
			],
			default: '',
			displayOptions: {
				show: {
					setCipher: [true],
				},
			},
		},
		{
			displayName: 'Specify Compression',
			name: 'setCompression',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'Compression',
			name: 'compress',
			type: 'options',
			options: [
				{ name: 'none', value: 'none' },
				{ name: 'zlib@openssh.com', value: 'zlib@openssh.com' },
				{ name: 'zlib', value: 'zlib' },
			],
			default: '',
			displayOptions: {
				show: {
					setCompression: [true],
				},
			},
		},
		{
			displayName: 'Specify MAC Algorithm',
			name: 'setMAC',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'MAC Algorithm',
			name: 'hmac',
			type: 'options',
			options: [
				{ name: 'hmac-sha2-256-etm@openssh.com', value: 'hmac-sha2-256-etm@openssh.com' },
				{ name: 'hmac-sha2-512-etm@openssh.com', value: 'hmac-sha2-512-etm@openssh.com' },
				{ name: 'hmac-sha1-etm@openssh.com', value: 'hmac-sha1-etm@openssh.com' },
				{ name: 'hmac-sha2-256', value: 'hmac-sha2-256' },
				{ name: 'hmac-sha2-512', value: 'hmac-sha2-512' },
				{ name: 'hmac-sha1', value: 'hmac-sha1' },
				{ name: 'hmac-md5', value: 'hmac-md5' },
				{ name: 'hmac-sha2-256-96', value: 'hmac-sha2-256-96' },
				{ name: 'hmac-sha2-512-96', value: 'hmac-sha2-512-96' },
				{ name: 'hmac-ripemd160', value: 'hmac-ripemd160' },
				{ name: 'hmac-sha1-96', value: 'hmac-sha1-96' },
				{ name: 'hmac-md5-96', value: 'hmac-md5-96' },
			],
			default: '',
			displayOptions: {
				show: {
					setMAC: [true],
				},
			},
		},
		{
			displayName: 'Specify Key Exchange',
			name: 'setKeyExchange',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'Key Exchange',
			name: 'kex',
			type: 'options',
			options: [
				{ name: 'curve25519-sha256', value: 'curve25519-sha256' },
				{ name: 'curve25519-sha256@libssh.org', value: 'curve25519-sha256@libssh.org' },
				{ name: 'ecdh-sha2-nistp256', value: 'ecdh-sha2-nistp256' },
				{ name: 'ecdh-sha2-nistp384', value: 'ecdh-sha2-nistp384' },
				{ name: 'ecdh-sha2-nistp521', value: 'ecdh-sha2-nistp521' },
				{
					name: 'diffie-hellman-group-exchange-sha256',
					value: 'diffie-hellman-group-exchange-sha256',
				},
				{ name: 'diffie-hellman-group14-sha256', value: 'diffie-hellman-group14-sha256' },
				{ name: 'diffie-hellman-group15-sha512', value: 'diffie-hellman-group15-sha512' },
				{ name: 'diffie-hellman-group16-sha512', value: 'diffie-hellman-group16-sha512' },
				{ name: 'diffie-hellman-group17-sha512', value: 'diffie-hellman-group17-sha512' },
				{ name: 'diffie-hellman-group18-sha512', value: 'diffie-hellman-group18-sha512' },
				{ name: 'diffie-hellman-group-exchange-sha1', value: 'diffie-hellman-group-exchange-sha1' },
				{ name: 'diffie-hellman-group14-sha1', value: 'diffie-hellman-group14-sha1' },
				{ name: 'diffie-hellman-group1-sha1', value: 'diffie-hellman-group1-sha1' },
			],
			default: '',
			displayOptions: {
				show: {
					setKeyExchange: [true],
				},
			},
		},
		{
			displayName: 'Specify Host Key Algorithm',
			name: 'setHostAlgorithm',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'Host Key Algorithm',
			name: 'serverHostKey',
			type: 'options',
			options: [
				{ name: 'ssh-ed25519', value: 'ssh-ed25519' },
				{ name: 'ecdsa-sha2-nistp256', value: 'ecdsa-sha2-nistp256' },
				{ name: 'ecdsa-sha2-nistp384', value: 'ecdsa-sha2-nistp384' },
				{ name: 'ecdsa-sha2-nistp521', value: 'ecdsa-sha2-nistp521' },
				{ name: 'rsa-sha2-512', value: 'rsa-sha2-512' },
				{ name: 'rsa-sha2-256', value: 'rsa-sha2-256' },
				{ name: 'ssh-rsa', value: 'ssh-rsa' },
				{ name: 'ssh-dss', value: 'ssh-dss' },
			],
			default: '',
			displayOptions: {
				show: {
					setHostAlgorithm: [true],
				},
			},
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
	];
}
