import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class AirtableApi implements ICredentialType {
	name = 'airtableApi';
	displayName = 'Airtable API';
	documentationUrl = 'airtable';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
}
