import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class Kafka implements ICredentialType {
	name = 'kafka';
	displayName = 'Kafka';
	documentationUrl = 'kafka';
	properties = [
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string' as NodePropertyTypes,
			default: '',
			placeholder: 'my-app',
		},
		{
			displayName: 'Brokers',
			name: 'brokers',
			type: 'string' as NodePropertyTypes,
			default: '',
			placeholder: 'kafka1:9092,kafka2:9092',
		},
		{
			displayName: 'SSL',
			name: 'ssl',
			type: 'boolean' as NodePropertyTypes,
			default: true,
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string' as NodePropertyTypes,
			default: '',
			description: 'Optional username if authenticated is required.',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string' as NodePropertyTypes,
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'Optional password if authenticated is required.',
		},
	];
}
