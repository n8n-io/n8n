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
			displayName: 'Hostname',
			name: 'hostname',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Port',
			name: 'port',
			type: 'number' as NodePropertyTypes,
			default: 9092,
		},
	];
}
