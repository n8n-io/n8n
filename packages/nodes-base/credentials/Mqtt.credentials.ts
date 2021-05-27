import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class Mqtt implements ICredentialType {
	name = 'mqtt';
	displayName = 'MQTT';
	documentationUrl = 'mqtt';
	properties = [
		{
			displayName: 'Protocol',
			name: 'protocol',
			type: 'options' as NodePropertyTypes,
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
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Port',
			name: 'port',
			type: 'number' as NodePropertyTypes,
			default: 1883,
		},
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
		{
			displayName: 'Clean Session',
			name: 'clean',
			type: 'boolean' as NodePropertyTypes,
			default: true,
			description: `Set to false to receive QoS 1 and 2 messages while offline.`,
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string' as NodePropertyTypes,
			default: '',
			description: 'Client ID. If left empty, one is autogenrated for you',
		},
	];
}
