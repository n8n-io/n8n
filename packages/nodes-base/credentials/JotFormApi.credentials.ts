import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class JotFormApi implements ICredentialType {
	name = 'jotFormApi';
	displayName = 'JotForm API';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
