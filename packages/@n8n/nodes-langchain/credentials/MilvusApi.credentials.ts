import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MilvusApi implements ICredentialType {
	name = 'milvusApi';

	displayName = 'Milvus API';

	documentationUrl = 'https://docs.n8n.io/integrations/builtin/credentials/milvus/';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: false,
			default: '',
		},
		{
			displayName: 'Milvus URL',
			name: 'milvusUrl',
			type: 'string',
			required: true,
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.milvusUrl}}',
			headers: {
				accept: 'application/json; charset=utf-8',
			},
		},
	};
}
