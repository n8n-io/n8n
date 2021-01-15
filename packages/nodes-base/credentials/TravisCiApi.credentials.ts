import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class TravisCiApi implements ICredentialType {
	name = 'travisCiApi';
	displayName = 'Travis API';
	documentationUrl = 'travisCi';
	properties = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
