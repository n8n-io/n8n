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
			displayName: 'Authentication Mode',
			name: 'authMode',
			type: 'options',
			default: 'none',
			options: [
				{ name: 'None', value: 'none' },
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
					authMode: ['userpass'],
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
					authMode: ['userpass'],
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
					authMode: ['userpass'],
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
