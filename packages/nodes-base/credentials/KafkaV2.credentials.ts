import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class KafkaV2 implements ICredentialType {
	name = 'kafkaV2';

	displayName = 'Kafka with Schema Registry';

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
			required: true,
			default: '',
			placeholder: 'kafka1:9092,kafka2:9092',
			description: 'Comma-separated list of Kafka brokers',
		},
		{
			displayName: 'SSL',
			name: 'ssl',
			type: 'boolean',
			default: true,
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'boolean',
			default: false,
			description: 'Whether to use SASL authentication for Kafka',
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
			description: 'Username for Kafka authentication',
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
			description: 'Password for Kafka authentication',
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
					name: 'PLAIN',
					value: 'plain',
				},
				{
					name: 'SCRAM-SHA-256',
					value: 'scram-sha-256',
				},
				{
					name: 'SCRAM-SHA-512',
					value: 'scram-sha-512',
				},
			],
			default: 'plain',
		},
		{
			displayName: 'Use Schema Registry',
			name: 'useSchemaRegistry',
			type: 'boolean',
			default: false,
			description:
				'Whether to use Confluent Schema Registry to automatically deserialize Avro-encoded messages. The schema will be fetched from the registry based on the schema ID embedded in the message.',
		},
		{
			displayName: 'Schema Registry URL',
			name: 'schemaRegistryUrl',
			type: 'string',
			required: true,
			displayOptions: {
				show: {
					useSchemaRegistry: [true],
				},
			},
			default: '',
			placeholder: 'https://schema-registry-domain:8081',
			description: 'URL of the Confluent Schema Registry',
		},
		{
			displayName: 'Schema Registry Authentication Type',
			name: 'schemaRegistryAuthType',
			type: 'options',
			displayOptions: {
				show: {
					useSchemaRegistry: [true],
				},
			},
			options: [
				{
					name: 'None',
					value: 'none',
				},
				{
					name: 'Basic Authentication',
					value: 'basic',
				},
				{
					name: 'TLS/SSL (mTLS)',
					value: 'tls',
				},
			],
			default: 'none',
			description: 'Authentication method for Schema Registry',
		},
		// Basic Authentication
		{
			displayName: 'Schema Registry Username',
			name: 'schemaRegistryUsername',
			type: 'string',
			required: true,
			displayOptions: {
				show: {
					useSchemaRegistry: [true],
					schemaRegistryAuthType: ['basic'],
				},
			},
			default: '',
			description: 'Username for Schema Registry basic authentication',
		},
		{
			displayName: 'Schema Registry Password',
			name: 'schemaRegistryPassword',
			type: 'string',
			required: true,
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					useSchemaRegistry: [true],
					schemaRegistryAuthType: ['basic'],
				},
			},
			default: '',
			description: 'Password for Schema Registry basic authentication',
		},
		// TLS/SSL Authentication
		{
			displayName: 'Client Certificate',
			name: 'schemaRegistryClientCert',
			type: 'string',
			required: true,
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					useSchemaRegistry: [true],
					schemaRegistryAuthType: ['tls'],
				},
			},
			default: '',
			placeholder: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
			description: 'Client certificate for TLS authentication (PEM format)',
		},
		{
			displayName: 'Client Key',
			name: 'schemaRegistryClientKey',
			type: 'string',
			required: true,
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					useSchemaRegistry: [true],
					schemaRegistryAuthType: ['tls'],
				},
			},
			default: '',
			placeholder: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----',
			description: 'Client private key for TLS authentication (PEM format)',
		},
		{
			displayName: 'CA Certificate',
			name: 'schemaRegistryCaCert',
			type: 'string',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					useSchemaRegistry: [true],
					schemaRegistryAuthType: ['tls'],
				},
			},
			default: '',
			placeholder: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
			description: 'CA certificate for TLS authentication (PEM format, optional)',
		},
	];
}
