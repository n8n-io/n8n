import {
	ICredentialType,
	IDisplayOptions,
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
					name: 'mqtts (SSL/TLS)',
					value: 'mqtts',
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
		{
			displayName: 'SSL',
			name: 'ssl',
			type: 'boolean' as NodePropertyTypes,
			default: false,
		},
		{
			displayName: 'Passwordless',
			name: 'passwordless',
			type: 'boolean' as NodePropertyTypes,
			displayOptions: {
				show: {
					ssl: [
						true,
					],
				},
			},
			default: true,
			description: 'Passwordless connection with certificates (SASL mechanism EXTERNAL)',
		},
		{
			displayName: 'CA Certificates',
			name: 'ca',
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
			description: 'SSL CA Certificates to use.',
		},
		{
			displayName: 'Reject Unauthorized Certificate',
			name: 'rejectUnauthorized',
			type: 'boolean' as NodePropertyTypes,			
			displayOptions: {
				show: {
					ssl: [
						true,
					],
					passwordless: [
						true,
					],
				},
			} as IDisplayOptions,
			default: '',
			description: 'Validate Certificate.',
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
					passwordless: [
						true,
					],
				},
			} as IDisplayOptions,
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
					passwordless: [
						true,
					],
				},
			},
			default: '',
			description: 'SSL Client Key to use.',
		},
	];
}
