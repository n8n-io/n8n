import { createClient } from '@supabase/supabase-js';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

// supabase-js arms a 30s token-refresh interval per client that keeps the
// whole client graph reachable for the process lifetime. The vector store
// only talks to PostgREST with a service-role key.
export function createSupabaseClient(credentials: ICredentialDataDecryptedObject) {
	return createClient(credentials.host as string, credentials.serviceRole as string, {
		auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
	});
}
