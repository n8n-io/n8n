import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class InfobipApi implements ICredentialType {
	name = 'infobipApi';
	displayName = 'Infobip API Token';
	documentationUrl = 'infobip';
	properties = [
		{
			displayName: 'Base URL (e.g. https://p123l.api.infobip.com/ - see https://www.infobip.com/docs/api)',
			name: 'URL',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'API Key (get it from https://portal.infobip.com/settings/accounts/api-keys)',
			name: 'token',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
