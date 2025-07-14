import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class XataApi implements ICredentialType {
	name = 'xataApi';

	displayName = 'Xata Api';

	documentationUrl = 'xata';

	properties: INodeProperties[] = [
		{
			displayName: 'Database Endpoint',
			name: 'databaseEndpoint',
			required: true,
			type: 'string',
			default: '',
			placeholder: 'https://{workspace}.{region}.xata.sh/db/{database}',
		},
		{
			displayName: 'Branch',
			name: 'branch',
			required: true,
			type: 'string',
			default: 'main',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
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
			baseURL: '={{$credentials.databaseEndpoint}}:{{$credentials.branch}}',
		},
	};
}
