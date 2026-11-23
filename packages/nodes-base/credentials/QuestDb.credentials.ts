import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class QuestDb implements ICredentialType {
	name = 'questDb';

	displayName = 'QuestDB';

	documentationUrl = 'questdb';

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
			default: 'qdb',
		},
		{
			displayName: 'User',
			name: 'user',
			type: 'string',
			default: 'admin',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: 'quest',
		},
		{
			displayName: 'SSL',
			name: 'ssl',
			type: 'options',
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
			displayName: 'CA Certificate',
			name: 'caCertificate',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			displayOptions: {
				show: {
					ssl: ['allow', 'require'],
				},
			},
			description:
				'PEM-encoded CA certificate used to verify the server. This replaces the certificate authorities that n8n trusts by default rather than adding to them, so include every authority in the server chain. Leave empty to use the default authorities.',
		},
		{
			displayName: 'Ignore SSL Issues (Insecure)',
			name: 'allowUnauthorizedCerts',
			type: 'boolean',
			default: false,
			displayOptions: {
				show: {
					ssl: ['allow', 'require'],
				},
			},
			description:
				'Whether to keep the connection encrypted but skip certificate verification, for example against a self-signed or hostname-mismatched certificate. Cannot be combined with a CA Certificate, which it would make unreachable.',
		},
		{
			displayName: 'Port',
			name: 'port',
			type: 'number',
			default: 8812,
		},
	];
}
