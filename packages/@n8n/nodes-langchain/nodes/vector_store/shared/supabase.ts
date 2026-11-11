import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

import { aiClientFetch } from '@n8n/ai-utilities';

// PostgreSQL unquoted identifier syntax, plus hyphens. PostgREST accepts
// hyphenated schema names (it quotes the identifier when it builds the
// search_path) and the core Supabase node passes the schema through unvalidated.
const VALID_SCHEMA_REGEX = /^[A-Za-z_][A-Za-z0-9_$-]*$/;

/**
 * Resolves the effective schema name from the node's useCustomSchema toggle and schema input.
 *
 * - Toggle off → always returns 'public', no validation.
 * - Toggle on + valid identifier → returns the trimmed schema name.
 * - Toggle on + invalid identifier → throws UserError.
 *
 * The regex matches PostgreSQL unquoted identifiers plus hyphens. It is the ASCII
 * subset that can be transmitted in the `Accept-Profile`/`Content-Profile` header
 * and matched by PostgREST: `@supabase/postgrest-js` writes the header value raw
 * (no percent-encoding), PostgREST decodes it as UTF-8 and compares it literally
 * against the exposed schema name, and Node encodes non-ASCII header values as
 * Latin-1 bytes that do not survive PostgREST's UTF-8 decode. Non-ASCII schema
 * names are rejected, and no supported encoding path exists around this.
 */
export function resolveSchema(useCustomSchema: boolean, schema: string): string {
	if (!useCustomSchema) return 'public';

	// RegExp.test coerces its argument, so `undefined`/`null`/booleans would
	// otherwise pass as "undefined"/"null"/"true". Reject non-strings first,
	// then trim: a header parser strips leading/trailing OWS anyway, so a
	// schema with surrounding whitespace can only be addressed trimmed.
	const trimmed = typeof schema === 'string' ? schema.trim() : schema;

	if (typeof trimmed !== 'string' || !VALID_SCHEMA_REGEX.test(trimmed)) {
		throw new UserError(
			`Schema name "${schema}" is invalid. Use only letters, digits, hyphens, underscores, and dollar signs; must start with a letter or underscore.`,
		);
	}

	return trimmed;
}

// supabase-js arms a 30s token-refresh interval per client that keeps the
// whole client graph reachable for the process lifetime. The vector store
// only talks to PostgREST with a service-role key.
//
// supabase-js accepts `global.fetch`, so wire the bounded AI fetch instead of
// the SDK default transport. This keeps an unbounded body from exhausting the
// heap if the Supabase endpoint is hostile or misbehaves.
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
		global: { fetch: aiClientFetch },
	}) as SupabaseClient;
}
