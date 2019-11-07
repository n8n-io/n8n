import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class FreshdeskApi implements ICredentialType {
	name = 'freshdeskApi';
	displayName = 'Freshdesk API';
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
			placeholder: 'https://domain.freshdesk.com',
			default: ''
        }
	];
}
