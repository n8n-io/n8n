import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class APITemplateioApi implements ICredentialType {
	name = 'apiTemplateioApi';
	displayName = 'APITemplateioApi API';
	documentationUrl = 'apitemplateio';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
