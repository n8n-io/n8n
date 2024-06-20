import type { ICredentialType, INodeProperties } from 'n8n-workflow';

// eslint-disable-next-line n8n-nodes-base/cred-class-name-unsuffixed
export class Ldap implements ICredentialType {
	// eslint-disable-next-line n8n-nodes-base/cred-class-field-name-unsuffixed
	name = 'ldap';

	displayName = 'LDAP';

	documentationUrl = 'ldap';

	properties: INodeProperties[] = [
		{
			displayName: 'LDAP Server Address',
			name: 'hostname',
			type: 'string',
			default: '',
			required: true,
			description: 'IP or domain of the LDAP server',
		},
		{
			displayName: 'LDAP Server Port',
			name: 'port',
			type: 'string',
			default: '389',
			description: 'Port used to connect to the LDAP server',
		},
		{
			displayName: 'Binding DN',
			name: 'bindDN',
			type: 'string',
			default: '',
			description: 'Distinguished Name of the user to connect as',
		},
		{
			displayName: 'Binding Password',
			name: 'bindPassword',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'Password of the user provided in the Binding DN field above',
		},
		{
			displayName: 'Connection Security',
			name: 'connectionSecurity',
			type: 'options',
			default: 'none',
			options: [
				{
					name: 'None',
					value: 'none',
				},
				{
					name: 'TLS',
					value: 'tls',
				},
				{
					name: 'STARTTLS',
					value: 'startTls',
				},
			],
		},
		{
			displayName: 'Ignore SSL/TLS Issues',
			name: 'allowUnauthorizedCerts',
			type: 'boolean',
			description: 'Whether to connect even if SSL/TLS certificate validation is not possible',
			default: false,
			displayOptions: {
				hide: {
					connectionSecurity: ['none'],
				},
			},
		},
		{
			displayName: 'CA Certificate',
			name: 'caCertificate',
			typeOptions: {
				alwaysOpenEditWindow: true,
			},
			displayOptions: {
				hide: {
					connectionSecurity: ['none'],
				},
			},
			type: 'string',
			default: '',
		},
		{
			displayName: 'Timeout',
			description: 'Optional connection timeout in seconds',
			name: 'timeout',
			type: 'number',
			default: 300,
		},
	];
}
