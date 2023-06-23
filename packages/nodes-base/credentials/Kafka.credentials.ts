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
			displayName: 'SSL CA',
			name: 'sslCa',
			type: 'string',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					ssl: [true],
				},
			},
			default: '',
			description: 'Cert chains in PEM format. One cert chain should be provided per private key. Each cert chain should consist of the PEM formatted certificate for a provided private key, followed by the PEM formatted intermediate certificates (if any), in order, and not including the root CA (the root CA must be pre-known to the peer, see ca). When providing multiple cert chains, they do not have to be in the same order as their private keys in key. If the intermediate certificates are not provided, the peer will not be able to validate the certificate, and the handshake will fail.', 
		},
		{
			displayName: 'SSL Cert',
			name: 'sslCert',
			type: 'string',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					ssl: [true],
				},
			},
			default: '',
			description: 'Cert chains in PEM format. One cert chain should be provided per private key. Each cert chain should consist of the PEM formatted certificate for a provided private key, followed by the PEM formatted intermediate certificates (if any), in order, and not including the root CA (the root CA must be pre-known to the peer, see ca). When providing multiple cert chains, they do not have to be in the same order as their private keys in key. If the intermediate certificates are not provided, the peer will not be able to validate the certificate, and the handshake will fail.', 
		},
		{
			displayName: 'SSL Key',
			name: 'sslKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					ssl: [true],
				},
			},
			default: '',
			description: 'Private keys in PEM format. PEM allows the option of private keys being encrypted. Encrypted keys will be decrypted with options.passphrase. Multiple keys using different algorithms can be provided either as an array of unencrypted key strings or buffers, or an array of objects in the form {pem: <string|buffer>[, passphrase: ]}. The object form can only occur in an array. object.passphrase is optional. Encrypted keys will be decrypted with object.passphrase if provided, or options.passphrase if it is not.', 
		},
		{
			displayName: 'SSL Key Passphrase',
			name: 'sslPassphrase',
			type: 'string',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					ssl: [true],
				},
			},
			default: '',
			description: 'Shared passphrase used for a single private key and/or a PFX.', 
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
