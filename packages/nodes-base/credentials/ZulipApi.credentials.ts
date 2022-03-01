import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ZulipApi implements ICredentialType {
	name = 'zulipApi';
	displayName = 'Zulip API';
	documentationUrl = 'zulip';
	properties: INodeProperties[] = [
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			default: '',
			placeholder: 'https://yourZulipDomain.zulipchat.com',
		},
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			default: '',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
}
