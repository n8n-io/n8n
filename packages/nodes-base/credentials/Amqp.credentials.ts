import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class Amqp implements ICredentialType {
	name = 'amqp';

	displayName = 'AMQP';

	documentationUrl = 'amqp';

	properties: INodeProperties[] = [
		{
			displayName: 'Hostname',
			name: 'hostname',
			type: 'string',
			default: '',
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
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
		{
			displayName: 'Transport Type',
			name: 'transportType',
			type: 'string',
			default: '',
			description: 'Optional Transport Type to use',
		},
	];
}
