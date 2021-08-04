import {
	ICredentialType,
	IDisplayOptions,
	INodeProperties,
} from 'n8n-workflow';

export class RabbitMQ implements ICredentialType {
	name = 'rabbitmq';
	displayName = 'RabbitMQ';
	documentationUrl = 'rabbitmq';
	properties: INodeProperties[] = [
		{
			displayName: 'Hostname',
			name: 'hostname',
			type: 'string',
			default: '',
			placeholder: 'localhost',
		},
		{
			displayName: 'Port',
			name: 'port',
			type: 'number',
			default: 5672,
		},
		{
			displayName: 'User',
			name: 'username',
			type: 'string',
			default: '',
			placeholder: 'guest',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			placeholder: 'guest',
		},
		{
			displayName: 'Vhost',
			name: 'vhost',
			type: 'string',
			default: '/',
		},
		{
			displayName: 'SSL',
			name: 'ssl',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'Passwordless',
			name: 'passwordless',
			type: 'boolean',
			displayOptions: {
				show: {
					ssl: [
						true,
					],
				},
			},
			default: true,
			description: 'Passwordless connection with certificates (SASL mechanism EXTERNAL)',
		},
		{
			displayName: 'CA Certificates',
			name: 'ca',
			type: 'string',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					ssl: [
						true,
					],
				},
			},
			default: '',
			description: 'SSL CA Certificates to use.',
		},
		{
			displayName: 'Client Certificate',
			name: 'cert',
			type: 'string',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					ssl: [
						true,
					],
					passwordless: [
						true,
					],
				},
			} as IDisplayOptions,
			default: '',
			description: 'SSL Client Certificate to use.',
		},
		{
			displayName: 'Client Key',
			name: 'key',
			type: 'string',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					ssl: [
						true,
					],
					passwordless: [
						true,
					],
				},
			},
			default: '',
			description: 'SSL Client Key to use.',
		},
		{
			displayName: 'Passphrase',
			name: 'passphrase',
			type: 'string',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					ssl: [
						true,
					],
					passwordless: [
						true,
					],
				},
			},
			default: '',
			description: 'SSL passphrase to use.',
		},
		// {
		// 	displayName: 'Client ID',
		// 	name: 'clientId',
		// 	type: 'string',
		// 	default: '',
		// 	placeholder: 'my-app',
		// },
		// {
		// 	displayName: 'Brokers',
		// 	name: 'brokers',
		// 	type: 'string',
		// 	default: '',
		// 	placeholder: 'kafka1:9092,kafka2:9092',
		// },
		// {
		// 	displayName: 'Username',
		// 	name: 'username',
		// 	type: 'string',
		// 	default: '',
		// 	description: 'Optional username if authenticated is required.',
		// },
		// {
		// 	displayName: 'Password',
		// 	name: 'password',
		// 	type: 'string',
		// 	typeOptions: {
		// 		password: true,
		// 	},
		// 	default: '',
		// 	description: 'Optional password if authenticated is required.',
		// },
	];
}
