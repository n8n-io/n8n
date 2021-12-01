import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ScrapingBeeApi implements ICredentialType {
	name = 'scrapingBeeApi';
	displayName = 'ScrapingBee API';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
}
