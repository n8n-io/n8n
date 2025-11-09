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
			displayName: 'Authentication',
			name: 'authentication',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'Authentication Mode',
			name: 'authMode',
			type: 'options',
			displayOptions: {
				show: {
					authentication: [true],
				},
			},
			default: 'userpass',
			description: 'Select the authentication mode to use.',
			options: [
				{ name: 'Username & Password', value: 'userpass' },
				{ name: 'AWS IAM Role', value: 'awsIam' },
			],
		},
		// ───────────── Username/Password (SASL) ─────────────
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			displayOptions: {
				show: {
					authentication: [true],
					// Backward-compatible: show if authMode is 'userpass' or not defined
					authMode: ['userpass', undefined],
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
					authMode: ['userpass', undefined],
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
					authMode: ['userpass', undefined],
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
		//───────────── IAM Role ─────────────
		{
			displayName: 'AWS Region',
			name: 'awsRegion',
			type: 'string',
			default: '',
			required: true,
			displayOptions: {
				show: {
					authentication: [true],
					authMode: ['awsIam'],
				},
			},
			description: 'AWS region where your MSK cluster is running',
		},
		{
			displayName: 'Access Key ID',
			name: 'accessKeyId',
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					authentication: [true],
					authMode: ['awsIam'],
				},
			},
		},
		{
			displayName: 'Secret Access Key',
			name: 'secretAccessKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			displayOptions: {
				show: {
					authentication: [true],
					authMode: ['awsIam'],
				},
			},
		},
		{
			displayName: 'Session Token (optional)',
			name: 'sessionToken',
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					authentication: [true],
					authMode: ['awsIam'],
				},
			},
		},
	];
}
