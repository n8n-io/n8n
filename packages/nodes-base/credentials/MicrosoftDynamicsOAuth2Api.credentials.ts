import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class MicrosoftDynamicsOAuth2Api implements ICredentialType {
	name = 'microsoftDynamicsOAuth2Api';

	extends = ['microsoftOAuth2Api'];

	displayName = 'Microsoft Dynamics OAuth2 API';

	documentationUrl = 'microsoft';

	properties: INodeProperties[] = [
		//	https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent
		{
			displayName: 'Subdomain',
			name: 'subdomain',
			type: 'string',
			required: true,
			placeholder: 'organization',
			default: '',
		},
		//	https://docs.microsoft.com/en-us/power-platform/admin/new-datacenter-regions
		//	https://arunpotti.com/2021/03/15/dynamics-365-crm-online-regions-list/
		{
			displayName: 'Region',
			name: 'region',
			type: 'options',
			default: 'crm.dynamics.com',
			options: [
				{
					name: 'Asia Pacific (APAC/ APJ)',
					value: 'crm5.dynamics.com',
				},
				{
					name: 'Australia (OCE)',
					value: 'crm6.dynamics.com',
				},
				{
					name: 'Canada (CAN)',
					value: 'crm3.dynamics.com',
				},
				{
					name: 'China (CHN)',
					value: 'crm.dynamics.cn',
				},
				{
					name: 'Europe, Middle East, Africa (EMEA/ EUR)',
					value: 'crm4.dynamics.com',
				},
				{
					name: 'France (FRA)',
					value: 'crm12.dynamics.com',
				},
				{
					name: 'Germany (GER)',
					value: 'crm16.dynamics.com',
				},
				{
					name: 'India (IND)',
					value: 'crm8.dynamics.com',
				},
				{
					name: 'Japan (JPN)',
					value: 'crm7.dynamics.com',
				},
				{
					name: 'Microsoft Cloud Germany (DEU)',
					value: 'crm.microsoftdynamics.de',
				},
				{
					name: 'North America (NAM)',
					value: 'crm.dynamics.com',
				},
				{
					name: 'North America 2 (US Gov GCC)',
					value: 'crm9.dynamics.com',
				},
				{
					name: 'South Africa (ZAF)',
					value: 'crm14.dynamics.com',
				},
				{
					name: 'South America (LATAM/ SAM)',
					value: 'crm2.dynamics.com',
				},
				{
					name: 'Switzerland (CHE)',
					value: 'crm17.dynamics.com',
				},
				{
					name: 'United Arab Emirates (UAE)',
					value: 'crm15.dynamics.com',
				},
				{
					name: 'United Kingdom (UK/ GBR)',
					value: 'crm11.dynamics.com',
				},
				{
					name: 'United States Government Community Cloud (GCC High)',
					value: 'crm.microsoftdynamics.us',
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
