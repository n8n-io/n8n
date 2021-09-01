import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class ScrapingBeeApi implements ICredentialType {
	name = 'scrapingBeeApi';
	displayName = 'ScrapingBee API';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
 