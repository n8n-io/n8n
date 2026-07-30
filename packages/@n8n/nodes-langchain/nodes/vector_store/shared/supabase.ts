import { createClient } from '@supabase/supabase-js';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

export function createSupabaseClient(credentials: ICredentialDataDecryptedObject) {
	return createClient(credentials.host as string, credentials.serviceRole as string, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	});
}
