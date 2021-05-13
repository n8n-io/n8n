import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class NotionApi implements ICredentialType {
	name = 'notionApi';
	displayName = 'Notion API';
	documentationUrl = 'notion';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
