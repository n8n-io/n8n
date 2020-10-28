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
		},
		{
			displayName: 'Brokers',
			name: 'brokers',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'SSL',
			name: 'ssl',
			type: 'boolean' as NodePropertyTypes,
			default: true,
		},
	];
}
