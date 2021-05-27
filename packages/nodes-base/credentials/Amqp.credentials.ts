import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class Amqp implements ICredentialType {
	name = 'amqp';
	displayName = 'AMQP';
	documentationUrl = 'amqp';
	properties = [
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
			default: 5672,
		},
		{
			displayName: 'User',
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
		{
			displayName: 'Transport Type',
			name: 'transportType',
			type: 'string' as NodePropertyTypes,
			default: '',
			description: 'Optional Transport Type to use.',
		},
	];
}
