/* eslint-disable n8n-nodes-base/cred-class-name-unsuffixed,n8n-nodes-base/cred-class-field-name-unsuffixed,n8n-nodes-base/cred-class-field-display-name-missing-api */
import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class Ldap implements ICredentialType {
	name = 'ldap';
	displayName = 'LDAP';
	properties: INodeProperties[] = [
		{
			displayName: 'Hostname',
			name: 'hostname',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Port',
			name: 'port',
			type: 'string',
			default: '389',
			description:
				'The port to connect to. If not specified, the default port will be used (389 or 636).',
		},
		{
			displayName: 'Bind DN',
			name: 'bindDN',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Bind Password',
			name: 'bindPassword',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
		{
			displayName: 'SSL / TLS',
			name: 'secure',
			type: 'boolean',
			default: false,
			required: true,
			description: 'Enable to use SSL / TLS',
		},
		{
			displayName: 'StartTLS',
			name: 'starttls',
			type: 'boolean',
			default: false,
			required: false,
			displayOptions: {
				show: {
					secure: [true],
				},
			},
		},
		{
			displayName: 'Ignore SSL/TLS Issues',
			name: 'allowUnauthorizedCerts',
			type: 'boolean',
			description: 'Whether to connect even if SSL/TLS certificate validation is not possible',
			default: false,
			displayOptions: {
				show: {
					secure: [true],
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
				show: {
					secure: [true],
				},
			},
			type: 'string',
			default: '',
		},
	];
}
