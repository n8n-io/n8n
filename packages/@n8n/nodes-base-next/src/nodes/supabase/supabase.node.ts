import { compat, credential, defineNode, str } from '@n8n/node-sdk';

// The legacy type stays the definition. Its host is the project URL without `/rest/v1`.
const host = str();

export const supabase = defineNode({
	id: 'supabase',
	displayName: 'Supabase',
	credential: credential({
		types: [
			compat('supabaseApi', {
				fields: { host },
				baseUrl: '{host}/rest/v1',
			}),
		],
	}),
});

export const row = supabase.resource('row', {
	input: {
		// The name goes into the request path, so a name of only dots must not pass.
		table: str().with({ pattern: '^(?!\\.{1,2}$).+$' }).hint('Table or view name, e.g. customers'),
		schema: str().hint('Postgres schema; the API default (public) when not set').optional(),
	},
});

export const tablePath = (table: string): `/${string}` => `/${encodeURIComponent(table)}`;

/** The schema headers of PostgREST: one for reads, one for writes. */
export const schemaHeaders = (schema: string | undefined, write: boolean) =>
	schema ? { [write ? 'Content-Profile' : 'Accept-Profile']: schema } : {};
