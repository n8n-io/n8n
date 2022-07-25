import { ICredentialType, INodeProperties } from 'n8n-workflow';

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
		},
	];
}
