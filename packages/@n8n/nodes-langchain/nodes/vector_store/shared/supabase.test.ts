vi.mock('@supabase/supabase-js', () => ({
	createClient: vi.fn(),
}));

vi.mock('@n8n/ai-utilities', () => ({
	aiClientFetch: vi.fn(),
}));

import { createClient } from '@supabase/supabase-js';
import { aiClientFetch } from '@n8n/ai-utilities';
import { UserError } from 'n8n-workflow';

import { createSupabaseClient, resolveSchema } from './supabase';

const baseCredentials = {
	host: 'https://example.supabase.co',
	serviceRole: 'service-role-key',
};

const serverSideAuthOptions = {
	auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
};

describe('createSupabaseClient', () => {
	it('creates a client with server-side auth options and default public schema', () => {
		createSupabaseClient(baseCredentials);

		expect(createClient).toHaveBeenCalledWith('https://example.supabase.co', 'service-role-key', {
			...serverSideAuthOptions,
			db: { schema: 'public' },
			global: { fetch: aiClientFetch },
		});
	});

	it('creates a client with an explicit custom schema', () => {
		createSupabaseClient(baseCredentials, 'myschema');

		expect(createClient).toHaveBeenCalledWith(baseCredentials.host, baseCredentials.serviceRole, {
			...serverSideAuthOptions,
			db: { schema: 'myschema' },
			global: { fetch: aiClientFetch },
		});
	});

	it('bounds responses by wiring the shared aiClientFetch as the global fetch', () => {
		createSupabaseClient(baseCredentials);

		const options = vi.mocked(createClient).mock.calls.at(-1)?.[2] as {
			global?: { fetch?: unknown };
		};
		expect(options.global?.fetch).toBe(aiClientFetch);
	});
});

describe('resolveSchema', () => {
	it.each([
		[false, '', 'public'],
		[false, 'anything', 'public'],
		[true, 'public', 'public'],
		[true, 'myschema', 'myschema'],
		[true, 'my_schema_v2', 'my_schema_v2'],
		[true, '_private', '_private'],
		[true, 'my$schema', 'my$schema'],
		[true, 'my-schema', 'my-schema'],
		[true, ' myschema ', 'myschema'],
		[true, 'schema\r', 'schema'], // surrounding whitespace is trimmed
		[true, 'schema\n', 'schema'],
	] as Array<[boolean, string, string]>)(
		'resolveSchema(%s, %j) returns %j',
		(useCustomSchema, schema, expected) => {
			expect(resolveSchema(useCustomSchema, schema)).toBe(expected);
		},
	);

	it.each([
		[true, '$nope'],
		[true, ''],
		[true, '  '],
		[true, '1schema'],
		[true, 'my schema'],
		[true, 'sch"ma'],
		[true, 'sch\r\nema'], // internal CRLF is not trimmed
		[true, 'schema\rx'], // internal CR is not trimmed
		[true, 'sch\u00e9ma'], // é — non-ASCII
	] as Array<[boolean, string]>)(
		'resolveSchema(%s, %j) throws UserError',
		(useCustomSchema, schema) => {
			expect(() => resolveSchema(useCustomSchema, schema)).toThrow(UserError);
		},
	);

	// `RegExp.test` coerces its argument, so a non-string value would otherwise
	// slip past validation as "undefined"/"null"/"true".
	it.each([undefined, null, true, false])(
		'resolveSchema(true, %j) throws UserError for a non-string schema',
		(schema) => {
			expect(() => resolveSchema(true, schema as unknown as string)).toThrow(UserError);
		},
	);
});
