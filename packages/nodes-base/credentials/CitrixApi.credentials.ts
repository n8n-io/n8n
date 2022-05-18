import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class CitrixApi implements ICredentialType {
	name = 'citrixApi';
	displayName = 'Citrix API';
	documentationUrl = 'citrix';
	properties: INodeProperties[] = [
		{
			displayName: 'Region',
			name: 'region',
			type: 'options',
			options: [
				{
					name: 'Asia Pacific South',
					value: 'api-ap-s.cloud.com',
				},
				{
					name: 'European Union',
					value: 'api-eu.cloud.com',
				},
				{
					name: 'United States',
					value: 'api-us.cloud.com',
				},
				{
					name: 'Japan',
					value: 'api.citrixcloud.jp',
				},
			],
			default: 'api-us.cloud.com',
		},
		{
			displayName: 'Customer ID',
			name: 'customerId',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
		},
	];
}
