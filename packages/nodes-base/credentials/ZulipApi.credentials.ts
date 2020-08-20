import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class ZulipApi implements ICredentialType {
	name = 'zulipApi';
	displayName = 'Zulip API';
	documentationUrl = 'zulip';
	properties = [
		{
			displayName: 'URL',
			name: 'url',
			type: 'string' as NodePropertyTypes,
			default: '',
			placeholder: 'https://yourZulipDomain.zulipchat.com',
		},
		{
			displayName: 'Email',
			name: 'email',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
