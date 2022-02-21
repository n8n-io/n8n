import {
	ICredentialType,
	IDisplayOptions,
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
					name: 'mqtts',
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
		{
			displayName: 'SSL',
			name: 'ssl',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'Passwordless',
			name: 'passwordless',
			type: 'boolean',
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
			type: 'string',
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
			type: 'boolean',			
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
			type: 'string',
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
			type: 'string',
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
