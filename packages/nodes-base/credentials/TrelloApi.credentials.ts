import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class TrelloApi implements ICredentialType {
	name = 'trelloApi';
	displayName = 'Trello API';
	documentationUrl = 'trello';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'OAuth Secret',
			name: 'oauthSecret',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
