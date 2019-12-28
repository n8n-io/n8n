import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class EvernoteApi implements ICredentialType {
	name = 'evernoteApi';
	displayName = 'Evernote API';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
