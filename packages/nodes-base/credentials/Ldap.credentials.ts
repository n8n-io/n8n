/* eslint-disable n8n-nodes-base/cred-class-name-unsuffixed,n8n-nodes-base/cred-class-field-name-unsuffixed,n8n-nodes-base/cred-class-field-display-name-missing-api */
import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class Ldap implements ICredentialType {
	name = 'ldap';

	displayName = 'LDAP';

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
			required: true,
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
			required: true,
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
	];
}
