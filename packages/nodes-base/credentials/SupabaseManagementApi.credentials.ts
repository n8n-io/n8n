import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SupabaseManagementApi implements ICredentialType {
	name = 'supabaseManagementApi';

	displayName = 'Supabase Management API';

	documentationUrl = 'supabase';

	properties: INodeProperties[] = [
		{
			displayName: 'Project Reference',
			name: 'projectRef',
			type: 'string',
			default: '',
			placeholder: 'abcdefghijklmnopqrst',
			description:
				'The 20-character project reference ID from your Supabase project Settings → General',
		},
		{
			displayName: 'Personal Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.supabase.com',
			url: '=/v1/projects/{{$credentials.projectRef}}/database/query',
			method: 'POST',
			body: { query: 'SELECT 1' },
		},
	};
}
