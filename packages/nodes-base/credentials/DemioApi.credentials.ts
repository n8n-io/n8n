import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class DemioApi implements ICredentialType {
	name = 'demioApi';
	displayName = 'Demio API';
	documentationUrl = 'demio';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'API Secret',
			name: 'apiSecret',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
