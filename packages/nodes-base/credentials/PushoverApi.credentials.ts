import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class PushoverApi implements ICredentialType {
	name = 'pushoverApi';
	displayName = 'Pushover API';
	documentationUrl = 'pushover';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
