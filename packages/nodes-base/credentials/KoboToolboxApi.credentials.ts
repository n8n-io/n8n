import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class KoboToolboxApi implements ICredentialType {
	name = 'koboToolboxApi';
	displayName = 'KoboToolbox API Token';
	// See https://support.kobotoolbox.org/api.html
	documentationUrl = 'koboToolbox';
	properties = [
		{
			displayName: 'API root URL (e.g. https://kf.kobotoolbox.org/)',
			name: 'URL',
			type: 'string' as NodePropertyTypes,
			default: 'https://kf.kobotoolbox.org/',
			placeholder: 'https://kf.kobotoolbox.org/',
		},
		{
			displayName: 'API Token (get it from https://[api-root]/token/?format=json)',
			name: 'token',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
