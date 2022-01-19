import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class StatusPageApi implements ICredentialType {
	name = 'statusPageApi';
	displayName = 'StatusPage API';
	documentationUrl = 'statusPage';
	properties = [
			{
					displayName: 'API Key',
					name: 'apiKey',
					type: 'string' as NodePropertyTypes,
					default: '',
			},
	];
}
