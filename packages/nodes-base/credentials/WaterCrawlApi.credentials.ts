import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class WaterCrawlApi implements ICredentialType {
	name = 'waterCrawlApi';
	displayName = 'WaterCrawl API';
	documentationUrl = 'https://docs.watercrawl.dev';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'The API key for WaterCrawl',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://app.watercrawl.dev',
			description: 'The base URL of the WaterCrawl API',
		},
	];
}
