import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class TwilioApi implements ICredentialType {
	name = 'twilioApi';
	displayName = 'Twilio API';
	documentationUrl = 'twilio';
	properties = [
		{
			displayName: 'Auth Type',
			name: 'authType',
			type: 'options' as NodePropertyTypes,
			default: 'authToken',
			options: [
				{
					name: 'Auth Token',
					value: 'authToken',
				},
				{
					name: 'API Key',
					value: 'apiKey',
				},
			],
		},
		{
			displayName: 'Account SID',
			name: 'accountSid',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Auth Token',
			name: 'authToken',
			type: 'string' as NodePropertyTypes,
			default: '',
			displayOptions: {
				show: {
					authType: [
						'authToken',
					],
				},
			},
		},
		{
			displayName: 'API Key SID',
			name: 'apiKeySid',
			type: 'string' as NodePropertyTypes,
			default: '',
			displayOptions: {
				show: {
					authType: [
						'apiKey',
					],
				},
			},
		},
		{
			displayName: 'API Key Secret',
			name: 'apiKeySecret',
			type: 'string' as NodePropertyTypes,
			typeOptions: {
				password: true,
			},
			default: '',
			displayOptions: {
				show: {
					authType: [
						'apiKey',
					],
				},
			},
		},
	];
}
