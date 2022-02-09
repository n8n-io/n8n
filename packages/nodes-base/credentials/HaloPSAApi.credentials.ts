import {
	ICredentialType,
	INodeProperties,
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
			description: 'Hosting Type',
		},
		{
			displayName: 'HaloPSA Authorisation Server URL',
			name: 'authUrl',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Resource Server',
			name: 'resourceApiUrl',
			type: 'string',
			default: '',
			required: true,
			description: `The Resource server is available at your "Halo Web Application url/api"`,
		},
		{
			displayName: 'Client ID',
			name: 'client_id',
			type: 'string',
			default: '',
			required: true,
			description: 'Must be your application client id',
		},
		{
			displayName: 'Client Secret',
			name: 'client_secret',
			type: 'string',
			default: '',
			required: true,
			description: 'Must be your application client secret',
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
			type: 'hidden',
			default: 'admin edit:tickets edit:customers',
			required: true,
		},
	];
}
