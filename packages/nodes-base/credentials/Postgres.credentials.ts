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
			displayName: 'SSL',
			name: 'ssl',
			type: 'options',
			options: [
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
			displayName: 'Ignore SSL Issues (Insecure)',
			name: 'allowUnauthorizedCerts',
			type: 'boolean',
			default: false,
			description: 'Whether to connect even if SSL certificate validation is not possible.',
			displayOptions: {
				show: {
					ssl: ['require'],
				},
			},
		},
		{
			displayName: 'Server name override for SSL',
			name: 'servername',
			type: 'string',
			default: '',
			description:
				'Override the server name used to verify the certificate. Use this when the host is an IP but has a certificate from a recognized CA.',
			displayOptions: {
				show: {
					ssl: ['require'],
				},
			},
		},
		{
			displayName: 'CA Certificate',
			name: 'caCert',
			type: 'string',
			default: '',
			description:
				'Certificate for the CA root that should be used to verify the server certificate. By default, all system roots are used.',
			typeOptions: {
				alwaysOpenEditWindow: true,
			},
			displayOptions: {
				show: {
					ssl: ['require'],
				},
			},
		},
		{
			displayName: 'Client Certificate',
			name: 'clientCert',
			type: 'string',
			default: '',
			description:
				'Client certificate to provide to the server, in case the server requires client certificates.',
			typeOptions: {
				alwaysOpenEditWindow: true,
			},
			displayOptions: {
				show: {
					ssl: ['require'],
				},
			},
		},
		{
			displayName: 'Client Key',
			name: 'clientKey',
			type: 'string',
			default: '',
			description: 'Client key corresponding to the client certificate',
			typeOptions: {
				alwaysOpenEditWindow: true,
				password: true,
			},
			displayOptions: {
				show: {
					ssl: ['require'],
				},
			},
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
