import { defineNode, path, t } from '@n8n/node-sdk';
import { credential, defineCredential, field } from '@n8n/node-sdk/credentials';

export const supabaseKey = defineCredential({
	id: 'supabase.secretKey',
	version: '1.0.0',
	legacyName: 'supabaseApi',
	displayName: 'Supabase API',
	docs: 'supabase',
	fields: {
		host: field
			.url('Host')
			.describe(
				'Your Supabase project URL without the <code>/rest/v1</code> path. If you copied the full Data API URL, remove the <code>/rest/v1</code> suffix.',
			)
			.with({ examples: ['https://your_account.supabase.co'] }),
		serviceRole: field
			.secret('Secret Key')
			.describe(
				'Your Supabase project secret key. You can create one in the <a href="https://supabase.com/dashboard/project/_/settings/api-keys" target="_blank">API Keys settings</a> of your project. Legacy service_role secrets are also supported.',
			),
	},
	baseUrl: '{host}/rest/v1',
	auth: (a) =>
		a.apply({ headers: { apikey: '{serviceRole}', Authorization: 'Bearer {serviceRole}' } }),
	test: { get: '/' },
});

export const supabase = defineNode({
	id: 'supabase',
	displayName: 'Supabase',
	credential: credential({ types: [supabaseKey] }),
});

export const row = supabase.resource('row', {
	input: {
		// The name goes into the request path, so a name of only dots must not pass.
		table: t
			.str()
			.with({ pattern: '^(?!\\.{1,2}$).+$' })
			.title('Table Name')
			.hint('Table or view name, e.g. customers'),
		schema: t
			.str()
			.title('Schema')
			.hint('Postgres schema; the API default (public) when not set')
			.optional(),
	},
});

export const tablePath = (table: string) => path`/${table}`;

/** The schema headers of PostgREST: one for reads, one for writes. */
export const schemaHeaders = (schema: string | undefined, write: boolean) =>
	schema ? { [write ? 'Content-Profile' : 'Accept-Profile']: schema } : {};
