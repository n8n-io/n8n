import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class RabbitMQ implements ICredentialType {
	name = 'rabbitmq';
	displayName = 'RabbitMQ';
	documentationUrl = 'rabbitmq';
	properties = [
		{
			displayName: 'Hostname',
			name: 'hostname',
			type: 'string' as NodePropertyTypes,
			default: '',
			placeholder: 'localhost',
		},
		{
			displayName: 'Port',
			name: 'port',
			type: 'number' as NodePropertyTypes,
			default: 5672,
		},
		{
			displayName: 'User',
			name: 'username',
			type: 'string' as NodePropertyTypes,
			default: '',
			placeholder: 'guest',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string' as NodePropertyTypes,
			typeOptions: {
				password: true,
			},
			default: '',
			placeholder: 'guest',
		},
		{
			displayName: 'Vhost',
			name: 'vhost',
			type: 'string' as NodePropertyTypes,
			default: '/',
		},
		{
			displayName: 'SSL',
			name: 'ssl',
			type: 'boolean' as NodePropertyTypes,
			default: false,
		},
		{
			displayName: 'Client Certificate',
			name: 'cert',
			type: 'string' as NodePropertyTypes,
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
			description: 'SSL Client Certificate to use.',
		},
		{
			displayName: 'Client Key',
			name: 'key',
			type: 'string' as NodePropertyTypes,
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
			description: 'SSL Client Key to use.',
		},
		{
			displayName: 'Passphrase',
			name: 'passphrase',
			type: 'string' as NodePropertyTypes,
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
			description: 'SSL passphrase to use.',
		},
		{
			displayName: 'CA Certificates',
			name: 'ca',
			type: 'string' as NodePropertyTypes,
			typeOptions: {
				password: true,
			},
			// typeOptions: {
			// 	multipleValues: true,
			// 	multipleValueButtonText: 'Add Certificate',
			// },
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
		// {
		// 	displayName: 'Client ID',
		// 	name: 'clientId',
		// 	type: 'string' as NodePropertyTypes,
		// 	default: '',
		// 	placeholder: 'my-app',
		// },
		// {
		// 	displayName: 'Brokers',
		// 	name: 'brokers',
		// 	type: 'string' as NodePropertyTypes,
		// 	default: '',
		// 	placeholder: 'kafka1:9092,kafka2:9092',
		// },
		// {
		// 	displayName: 'Username',
		// 	name: 'username',
		// 	type: 'string' as NodePropertyTypes,
		// 	default: '',
		// 	description: 'Optional username if authenticated is required.',
		// },
		// {
		// 	displayName: 'Password',
		// 	name: 'password',
		// 	type: 'string' as NodePropertyTypes,
		// 	typeOptions: {
		// 		password: true,
		// 	},
		// 	default: '',
		// 	description: 'Optional password if authenticated is required.',
		// },
	];
}
