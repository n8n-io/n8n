import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class Mqtt implements ICredentialType {
	name = 'mqtt';
	displayName = 'MQTT';
	documentationUrl = 'mqtt';
	properties: INodeProperties[] = [
		{
			displayName: 'Protocol',
			name: 'protocol',
			type: 'options',
			options: [
				{
					name: 'mqtt',
					value: 'mqtt',
				},
				{
					name: 'ws',
					value: 'ws',
				},
			],
			default: 'mqtt',
		},
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Port',
			name: 'port',
			type: 'number',
			default: 1883,
		},
		{
			displayName: 'Username',
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
			displayName: 'Clean Session',
			name: 'clean',
			type: 'boolean',
			default: true,
			description: `Set to false to receive QoS 1 and 2 messages while offline.`,
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			description: 'Client ID. If left empty, one is autogenrated for you',
		},
	];
}
