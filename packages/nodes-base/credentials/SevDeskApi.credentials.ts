import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class SevDeskApi implements ICredentialType {
	name = 'sevDeskApi';
	displayName = 'sevDesk API';
	documentationUrl = 'sevDesk';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}