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
					value: 'onPremise',
				},
				{
					name: 'Hosted Solution Of Halo',
					value: 'hostedHalo',
				},
			],
			default: '',
			required: true,
			description: 'Hosting Type',
		},
		{
			displayName: 'HaloPSA Authorisation Server Url',
			name: 'authUrl',
			type: 'string',
			default: '',
			required: true,
			description: 'Your Halo Authorisation Server Url',
		},
		{
			displayName: 'Resource Server',
			name: 'resourceApiUrl',
			type: 'string',
			default: '',
			placeholder: ' https://your-halo-web-app-url/api',
			required: true,
			description:
				'By default, the Resource server is available at *your Halo Web Applicaiton url*"/api". Each resource then has it\'s own endpoint, e.g Tickets are available at *your Halo Web Applicaiton url*"/api/tickets". Endpoints accept the HTTP GET, POST and DELETE methods depending on the resource that you are accessing.',
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
						'hostedHalo',
					],
				},
			},
			default: '',
			description: 'An additional tenant parameter for HaloPSA hosted solution',
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
