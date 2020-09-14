import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class Mqtt implements ICredentialType {
	name = 'mqtt';
	displayName = 'MQTT';
	documentationUrl = 'mqtt';
	properties = [
		// The credentials to get from user and save encrypted.
		// Properties can be defined exactly in the same way
		// as node properties.
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
	];
}

