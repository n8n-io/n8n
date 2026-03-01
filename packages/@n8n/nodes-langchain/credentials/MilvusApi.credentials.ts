import type {
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
	IAuthenticateGeneric,
} from 'n8n-workflow';

export class MilvusApi implements ICredentialType {
	name = 'milvusApi';

	displayName = 'Milvus';

	documentationUrl = 'milvus';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			required: true,
			type: 'string',
			default: 'http://localhost:19530',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.username}}:{{$credentials.password}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{ $credentials.baseUrl }}',
			url: '/v1/vector/collections',
			method: 'GET',
		},
	};
}
