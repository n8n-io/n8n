import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MicrosoftDynamicsOAuth2Api implements ICredentialType {
	name = 'microsoftDynamicsOAuth2Api';
	extends = [
		'microsoftOAuth2Api',
	];
	displayName = 'Microsoft Dynamics OAuth2 API';
	documentationUrl = 'microsoft';
	properties: INodeProperties[] = [
		//https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent
		{
			displayName: 'Subdomain',
			name: 'subdomain',
			type: 'string',
			required: true,
			placeholder: 'organization',
			default: '',
		},
		{
			displayName: 'Region',
			name: 'region',
			type: 'options',
			default: 'crm.dynamics.com',
			options: [
				{
					name: 'NAM',
					value: 'crm.dynamics.com',
				},
				{
					name: 'DEU',
					value: 'crm.microsoftdynamics.de',
				},
				{
					name: 'SAM',
					value: 'crm2.dynamics.com',
				},
				{
					name: 'CAN',
					value: 'crm3.dynamics.com',
				},
				{
					name: 'EUR',
					value: 'crm4.dynamics.com',
				},
				{
					name: 'FRA',
					value: 'crm12.dynamics.com',
				},
				{
					name: 'APJ',
					value: 'crm5.dynamics.com',
				},
				{
					name: 'OCE',
					value: 'crm6.dynamics.com',
				},
				{
					name: 'JPN',
					value: 'crm7.dynamics.com',
				},
				{
					name: 'IND',
					value: 'crm8.dynamics.com',
				},
				{
					name: 'GCC',
					value: 'crm9.dynamics.com',
				},
				{
					name: 'GCC High',
					value: 'crm.microsoftdynamics.us',
				},
				{
					name: 'GBR',
					value: 'crm11.dynamics.com',
				},
				{
					name: 'ZAF',
					value: 'crm14.dynamics.com',
				},
				{
					name: 'UAE',
					value: 'crm15.dynamics.com',
				},
				{
					name: 'GER',
					value: 'crm16.dynamics.com',
				},
				{
					name: 'CHE',
					value: 'crm17.dynamics.com',
				},
				{
					name: 'CHN',
					value: 'crm.dynamics.cn',
				},
			],
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: '=openid offline_access https://{{$self.subdomain}}.{{$self.region}}/.default',
		},
	];
}
