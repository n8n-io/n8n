import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class ThinkificApi implements ICredentialType {
	name = 'thinkificApi';
	displayName = 'Thinkific API';
	documentationUrl = 'thinkific';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
