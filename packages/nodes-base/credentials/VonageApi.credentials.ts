import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class VonageApi implements ICredentialType {
	name = 'vonageApi';
	displayName = 'Vonage API';
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
