import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

// PostgreSQL unquoted identifier syntax, restricted to ASCII for HTTP header safety (RFC 7230).
const VALID_SCHEMA_REGEX = /^[A-Za-z_][A-Za-z0-9_$]*$/;

/**
 * Resolves the effective schema name from the node's useCustomSchema toggle and schema input.
 *
 * - Toggle off → always returns 'public', no validation.
 * - Toggle on + valid identifier → returns the schema name.
 * - Toggle on + invalid identifier → throws UserError.
 *
 * The allow-list regex covers every practical PostgreSQL unquoted identifier and is
 * valid HTTP header field content per RFC 7230. Non-ASCII schema names are rejected
 * by design; they cannot be transmitted in Accept-Profile without encoding.
 */
export function resolveSchema(useCustomSchema: boolean, schema: string): string {
	if (!useCustomSchema) return 'public';

	if (!VALID_SCHEMA_REGEX.test(schema)) {
		throw new UserError(
			`Schema name "${schema}" is invalid. Use only letters, digits, underscores, and dollar signs; must start with a letter or underscore.`,
		);
	}

	return schema;
}

// supabase-js arms a 30s token-refresh interval per client that keeps the
// whole client graph reachable for the process lifetime. The vector store
// only talks to PostgREST with a service-role key.
//
// The return annotation `: SupabaseClient` is not sufficient on its own: TypeScript
// structurally checks the inferred return type, SupabaseClient<any, any, string>,
// against the declared default SupabaseClient<any, 'public', 'public'>, and rejects
// it because PostgrestClient<any, any, string> is not assignable to
// PostgrestClient<any, any, 'public'>. The cast is required by the SupabaseClient
// generic narrowing; the runtime value is unchanged.
export function createSupabaseClient(
	credentials: ICredentialDataDecryptedObject,
	schema = 'public',
): SupabaseClient {
	return createClient(credentials.host as string, credentials.serviceRole as string, {
		auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
		db: { schema },
	}) as SupabaseClient;
}
