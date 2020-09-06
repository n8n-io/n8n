import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class FreshdeskApi implements ICredentialType {
	name = 'freshdeskApi';
	displayName = 'Freshdesk API';
	documentationUrl = 'freshdesk';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Domain',
			name: 'domain',
			type: 'string' as NodePropertyTypes,
			placeholder: 'company',
			description: 'If the URL you get displayed on Freshdesk is "https://company.freshdesk.com" enter "company"',
			default: ''
        }
	];
}
