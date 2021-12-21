import {
	ICredentialType,
	INodeProperties,
	NodePropertyTypes,
} from 'n8n-workflow';

export class HaloPSAApi implements ICredentialType {
	name = 'haloPSAApi';
	displayName = 'HaloPSA API';
	documentationUrl = 'halopsa';
	properties: INodeProperties[] =  [
		{
			displayName: 'Hosting Type',
			name: 'hostingType',
			type: 'options',
			options: [
				{
					name: 'On-Premise Solution',
					value: 'on-premise',
				},
				{
					name: 'Hosted Solution',
					value: 'hosted',
				},
			],
			default: 'on-premise',
			required: true,
			description: 'Hosting Type',
		},
		{
			displayName: 'HaloPSA Applicaiton Url',
			name: 'appUrl',
			type: 'string',
			default: '',
			required: true,
			description: 'Your Halo Web Applicaiton Url',
		},
		{
			displayName: 'Client credentials"',
			name: 'grant_type',
			type: 'hidden',
			default: 'client_credentials',
			required: true,
			description: 'Must be "client_credentials"',
		},
		{
			displayName: 'Client ID',
			name: 'client_id',
			type: 'string',
			default: '',
			required: true,
			description: 'Must be your applications client id',
		},
		{
			displayName: 'Client Secret',
			name: 'client_secret',
			type: 'string',
			default: '',
			required: true,
			description: 'Must be your applications client secret',
		},
		{
			displayName: 'Tenant',
			name: 'tenant',
			type: 'string',
			displayOptions: {
				show: {
					hostingType: [
						'hosted',
					],
				},
			},
			default: '',
			description: 'An additional tenant parameter for hosted solution',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'string' as NodePropertyTypes,
			default: 'all',
			required: true,
			description: 'Must include any application permissions that are required by your application',
		},
	];
}
