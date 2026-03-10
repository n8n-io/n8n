import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MergeDevApi implements ICredentialType {
	name = 'mergeDevApi';

	displayName = 'Merge.dev API';

	documentationUrl = 'https://docs.merge.dev/basics/authentication/';

	icon: Icon = 'file:icons/MergeDev.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Your Merge.dev organization API key. Find it in your Merge.dev dashboard.',
		},
		{
			displayName: 'Account Token (Linked Account)',
			name: 'accountToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'The account token for this specific linked account. Find it in your Merge.dev dashboard under the linked account details.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
				'X-Account-Token': '={{$credentials.accountToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.merge.dev',
			url: '/api/ats/v1/linked-accounts',
		},
	};
}
