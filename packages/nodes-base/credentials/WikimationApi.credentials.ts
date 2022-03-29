import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class WikimationApi implements ICredentialType {
	name = 'wikimationApi';
	displayName = 'Wikimation API';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
