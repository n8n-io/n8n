vi.mock('@supabase/supabase-js', () => ({
	createClient: vi.fn(),
}));

import { createClient } from '@supabase/supabase-js';
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
		});
	});

	it('creates a client with an explicit custom schema', () => {
		createSupabaseClient(baseCredentials, 'myschema');

		expect(createClient).toHaveBeenCalledWith(baseCredentials.host, baseCredentials.serviceRole, {
			...serverSideAuthOptions,
			db: { schema: 'myschema' },
		});
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
		[true, 'schema\r'],
		[true, 'schema\n'],
		[true, 'sch\u00e9ma'], // é — non-ASCII
	] as Array<[boolean, string]>)(
		'resolveSchema(%s, %j) throws UserError',
		(useCustomSchema, schema) => {
			expect(() => resolveSchema(useCustomSchema, schema)).toThrow(UserError);
		},
	);
});
