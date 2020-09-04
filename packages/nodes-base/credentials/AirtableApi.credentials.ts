import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class AirtableApi implements ICredentialType {
	name = 'airtableApi';
	displayName = 'Airtable API';
	documentationUrl = 'airtable';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
