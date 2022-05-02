import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class FreshdeskApi implements ICredentialType {
	name = 'freshdeskApi';
	displayName = 'Freshdesk API';
	documentationUrl = 'freshdesk';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Domain',
			name: 'domain',
			type: 'string',
			placeholder: 'company',
			description: 'If the URL you get displayed on Freshdesk is "https://company.freshdesk.com" enter "company"',
			default: '',
		},
	];
}
