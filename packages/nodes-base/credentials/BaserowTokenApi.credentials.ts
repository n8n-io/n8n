import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class BaserowTokenApi implements ICredentialType {
	name = 'baserowTokenApi';

	displayName = 'Baserow Token API';

	documentationUrl = 'baserow';

	properties: INodeProperties[] = [
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: 'https://api.baserow.io',
		},
		{
			displayName: 'Database Token',
			name: 'token',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
			description:
				'In Baserow, click on top left corner, My settings, Database tokens, Create new.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Token {{$credentials.token}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.host}}',
			url: '/api/database/tables/all-tables/',
		},
	};
}
