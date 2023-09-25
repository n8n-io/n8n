import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class WolframAlphaApi implements ICredentialType {
	name = 'wolframAlphaApi';

	displayName = 'WolframAlphaApi';

	documentationUrl = 'wolframalpha';

	properties: INodeProperties[] = [
		{
			displayName: 'App ID',
			name: 'appId',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			qs: {
				api_key: '={{$credentials.appId}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.wolframalpha.com/v1',
			url: '=/simple',
			qs: {
				i: 'How much is 1 1',
				appid: '={{$credentials.appId}}',
			},
		},
	};
}
