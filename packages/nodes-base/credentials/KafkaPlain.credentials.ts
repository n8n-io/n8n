import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class KafkaPlain implements ICredentialType {
	extends = [
		'kafka',
	];
	name = 'kafkaPlain';
	displayName = 'Kafka';
	properties = [
		{
			displayName: 'Username',
			name: 'username',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string' as NodePropertyTypes,
			typeOptions: {
				password: true,
			},
			default: '',
		},
	];
}
