import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class Kafka implements ICredentialType {
	name = 'kafka';

	displayName = 'Kafka';

	documentationUrl = 'kafka';

	properties: INodeProperties[] = [
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			placeholder: 'my-app',
			hint: 'Will not affect the connection, but will be used to identify the client in the Kafka server logs. Read more <a href="https://kafka.apache.org/documentation/#design_quotasgroups">here</a>',
		},
		{
			displayName: 'Brokers',
			name: 'brokers',
			type: 'string',
			default: '',
			placeholder: 'kafka1:9092,kafka2:9092',
		},
		{
			displayName: 'SSL',
			name: 'ssl',
			type: 'boolean',
			default: true,
		},
		{
			displayName: 'CA Certificate',
			name: 'ca',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			displayOptions: {
				show: {
					ssl: [true],
				},
			},
			description:
				'PEM-encoded CA certificate(s) used to verify the broker. Leave empty to use the system CAs.',
		},
		{
			displayName: 'Client Certificate',
			name: 'cert',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			displayOptions: {
				show: {
					ssl: [true],
				},
			},
			description:
				'PEM-encoded client certificate for mutual TLS (mTLS). Provide together with the client private key.',
		},
		{
			displayName: 'Client Private Key',
			name: 'key',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			displayOptions: {
				show: {
					ssl: [true],
				},
			},
			description:
				'PEM-encoded client private key for mutual TLS (mTLS). Provide together with the client certificate.',
		},
		{
			// Kept last so the common-case TLS fields come first and the insecure
			// escape hatch is not the first thing presented after enabling SSL.
			displayName: 'Ignore SSL Issues (Insecure)',
			name: 'allowUnauthorizedCerts',
			type: 'boolean',
			default: false,
			displayOptions: {
				show: {
					ssl: [true],
				},
			},
			description:
				'Whether to connect even when SSL certificate validation fails (e.g. a self-signed or hostname-mismatched broker certificate)',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			displayOptions: {
				show: {
					authentication: [true],
				},
			},
			default: '',
			description: 'Optional username if authenticated is required',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			displayOptions: {
				show: {
					authentication: [true],
				},
			},
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'Optional password if authenticated is required',
		},
		{
			displayName: 'SASL Mechanism',
			name: 'saslMechanism',
			type: 'options',
			displayOptions: {
				show: {
					authentication: [true],
				},
			},
			options: [
				{
					name: 'Plain',
					value: 'plain',
				},
				{
					name: 'scram-sha-256',
					value: 'scram-sha-256',
				},
				{
					name: 'scram-sha-512',
					value: 'scram-sha-512',
				},
			],
			default: 'plain',
		},
	];
}
