import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class RagicTriggerApi implements ICredentialType {
	name = 'ragicTriggerApi';

	displayName = 'Ragic Trigger API';

	documentationUrl = 'ragicTrigger';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Please refer to <a href="https://www.ragic.com/intl/en/doc-user/20/personal-settings#4">here</a>',
		},
		{
			displayName: 'Sheet Url',
			name: 'sheetUrl',
			type: 'string',
			default: '',
			required: true,
			description:
				'Please copy the sheet url from "https" til the charactor before "?" and paste it.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '={{"Basic " + $credentials.apiKey}}',
			},
		},
	};
}
