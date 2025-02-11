import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SupabaseApi implements ICredentialType {
	name = 'supabaseApi';

	displayName = 'Supabase API';

	documentationUrl = 'supabase';

	properties: INodeProperties[] = [
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			placeholder: 'https://your_account.supabase.co',
			default: '',
		},
		{
			displayName: 'Service Role Secret',
			name: 'serviceRole',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
		},
		// [ria]
		{
			displayName: 'Schema',
			name: 'schema',
			type: 'string',
			default: 'public',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				apikey: '={{$credentials.serviceRole}}',
				Authorization: '=Bearer {{$credentials.serviceRole}}',
				// [ria] set
				'Accept-Profile': '={{$credentials.schema}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.host}}/rest/v1',
			headers: {
				Prefer: 'return=representation',
			},
			url: '/',
		},
		// [ria] this does not catch the error when schema is not found (406 - Not Acceptable) - need to put that in the docs! to expose the schema
		// rules: [
		// 	{
		// 		type: 'responseSuccessBody',
		// 		properties: {
		// 			key: 'error',
		// 			value: 'invalid_auth',
		// 			message: 'Invalid access token',
		// 		},
		// 	},
		// ],
	};
}

/**
 * cURL
 *
# Append /rest/v1/ to your URL, and then use the table name as the route.

# for GET or HEAD request use Accept-Profile
curl '<SUPABASE_URL>/rest/v1/todos' \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -H "Authorization: Bearer <SUPABASE_ANON_KEY>" \
  -H "Accept-Profile: myschema"

# for POST, PATCH, PUT and DELETE Request use Content-Profile
curl -X POST '<SUPABASE_URL>/rest/v1/todos' \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -H "Authorization: Bearer <SUPABASE_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -H "Content-Profile: myschema" \
  -d '{"column_name": "value"}'

 */
