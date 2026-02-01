import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class Redis implements ICredentialType {
	name = 'redis';
	displayName = 'Redis';
	documentationUrl = 'redis';
	properties: INodeProperties[] = [
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
			displayName: 'User',
			name: 'user',
			type: 'string',
			default: '',
			hint: 'Leave blank for password-only auth',
		},
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: 'localhost',
		},
		{
			displayName: 'Port',
			name: 'port',
			type: 'number',
			default: 6379,
		},
		{
			displayName: 'Database Number',
			name: 'database',
			type: 'number',
			default: 0,
		},
		{
			displayName: 'SSL',
			name: 'ssl',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'Disable TLS Verification (insecure)',
			name: 'disableTlsVerification',
			type: 'boolean',
			displayOptions: {
				show: {
					ssl: [true],
				},
			},
			default: false,
			description:
				'Whether to disable TLS certificate verification. Enable this to use self-signed certificates. WARNING: This makes the connection less secure.',
		},
	];
}
