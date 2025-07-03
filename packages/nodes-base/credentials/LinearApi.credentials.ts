import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class LinearApi implements ICredentialType {
	name = 'linearApi';

	displayName = 'Linear API';

	documentationUrl = 'linear';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.linear.app',
			url: '/graphql',
			method: 'POST',
			body: {
				query: `query Issue ($first: Int){
					issues (first: $first){
						nodes {
						id,
					}
				}
			}`,
				variables: {
					first: 1,
				},
			},
		},
	};
}
