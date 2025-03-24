import type { ICredentialType, INodeProperties } from 'n8n-workflow';

import { sshTunnelProperties } from '@utils/sshTunnel.properties';

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
			displayName: 'Maximum Number of Connections',
			name: 'maxConnections',
			type: 'number',
			default: 100,
			description:
				'Make sure this value times the number of workers you have is lower than the maximum number of connections your postgres instance allows.',
		},
		{
			displayName: 'Ignore SSL Issues (Insecure)',
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
			],
			default: 'disable',
		},
		{
			displayName: 'Server name override for SSL',
			name: 'servername',
			type: 'string',
			displayOptions: {
				show: {
					ssl: [true],
				},
			},
			default: '',
		},
		{
			displayName: 'CA Certificate',
			name: 'caCert',
			type: 'string',
			typeOptions: {
				alwaysOpenEditWindow: true,
			},
			displayOptions: {
				show: {
					ssl: [true],
				},
			},
			default: '',
		},
		{
			displayName: 'Client Certificate',
			name: 'clientCert',
			type: 'string',
			typeOptions: {
				alwaysOpenEditWindow: true,
			},
			displayOptions: {
				show: {
					ssl: [true],
				},
			},
			default: '',
		},
		{
			displayName: 'Client Key',
			name: 'clientKey',
			type: 'string',
			typeOptions: {
				alwaysOpenEditWindow: true,
				password: true,
			},
			displayOptions: {
				show: {
					ssl: [true],
				},
			},
			default: '',
		},
		{
			displayName: 'Port',
			name: 'port',
			type: 'number',
			default: 5432,
		},
		...sshTunnelProperties,
	];
}
