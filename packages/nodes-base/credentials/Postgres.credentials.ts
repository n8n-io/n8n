import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class Postgres implements ICredentialType {
	name = 'postgres';

	displayName = 'Postgres';

	documentationUrl = 'postgres';

	properties: INodeProperties[] = [
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: 'localhost',
		},
		{
			displayName: 'Database',
			name: 'database',
			type: 'string',
			default: 'postgres',
		},
		{
			displayName: 'User',
			name: 'user',
			type: 'string',
			default: 'postgres',
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
			displayName: 'Ignore SSL Issues',
			name: 'allowUnauthorizedCerts',
			type: 'boolean',
			default: false,
			description: 'Whether to connect even if SSL certificate validation is not possible',
		},
		{
			displayName: 'SSL',
			name: 'ssl',
			type: 'options',
			displayOptions: {
				show: {
					allowUnauthorizedCerts: [false],
				},
			},
			options: [
				{
					name: 'Allow',
					value: 'allow',
				},
				{
					name: 'Disable',
					value: 'disable',
				},
				{
					name: 'Require',
					value: 'require',
				},
				{
					name: 'Verify (Not Implemented)',
					value: 'verify',
				},
				{
					name: 'Verify-Full (Not Implemented)',
					value: 'verify-full',
				},
			],
			default: 'disable',
		},
		{
			displayName: 'Port',
			name: 'port',
			type: 'number',
			default: 5432,
		},
		{
			displayName: 'SSH Tunnel',
			name: 'sshTunnel',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'SSH Authenticate with',
			name: 'sshAuthenticateWith',
			type: 'options',
			default: 'password',
			options: [
				{
					name: 'Password',
					value: 'password',
				},
				{
					name: 'Private Key',
					value: 'privateKey',
				},
			],
			displayOptions: {
				show: {
					sshTunnel: [true],
				},
			},
		},
		{
			displayName: 'SSH Host',
			name: 'sshHost',
			type: 'string',
			default: 'localhost',
			displayOptions: {
				show: {
					sshTunnel: [true],
				},
			},
		},
		{
			displayName: 'SSH Port',
			name: 'sshPort',
			type: 'number',
			default: 22,
			displayOptions: {
				show: {
					sshTunnel: [true],
				},
			},
		},
		{
			displayName: 'SSH Postgres Port',
			name: 'sshPostgresPort',
			type: 'number',
			default: 5432,
			displayOptions: {
				show: {
					sshTunnel: [true],
				},
			},
		},
		{
			displayName: 'SSH User',
			name: 'sshUser',
			type: 'string',
			default: 'root',
			displayOptions: {
				show: {
					sshTunnel: [true],
				},
			},
		},
		{
			displayName: 'SSH Password',
			name: 'sshPassword',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			displayOptions: {
				show: {
					sshTunnel: [true],
					sshAuthenticateWith: ['password'],
				},
			},
		},
		{
			displayName: 'Private Key',
			name: 'privateKey',
			type: 'string',
			typeOptions: {
				rows: 4,
				password: true,
			},
			default: '',
			displayOptions: {
				show: {
					sshTunnel: [true],
					sshAuthenticateWith: ['privateKey'],
				},
			},
		},
		{
			displayName: 'Passphrase',
			name: 'passphrase',
			type: 'string',
			default: '',
			description: 'Passphase used to create the key, if no passphase was used leave empty',
			displayOptions: {
				show: {
					sshTunnel: [true],
					sshAuthenticateWith: ['privateKey'],
				},
			},
		},
	];
}
