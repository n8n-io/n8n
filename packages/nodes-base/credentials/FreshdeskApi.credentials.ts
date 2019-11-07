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
	];
}
