/**
 * Unmocked: supabase.test.ts stubs `@supabase/supabase-js` and can only
 * assert call shape. This file constructs a real client and checks that
 * no 30s GoTrue auto-refresh ticker is armed.
 */
import { createSupabaseClient } from './supabase';

type AuthInternals = {
	autoRefreshTicker: NodeJS.Timeout | null;
	initialize: () => Promise<unknown>;
};

function getAuthInternals(client: { auth: object }): AuthInternals {
	return client.auth as AuthInternals;
}

const credentials = {
	host: 'https://example.supabase.co',
	serviceRole: 'test-service-role-key',
};

describe('createSupabaseClient (real supabase-js)', () => {
	it('does not arm a 30s token-refresh ticker (default schema)', async () => {
		const client = createSupabaseClient(credentials);

		await getAuthInternals(client).initialize();

		expect(getAuthInternals(client).autoRefreshTicker).toBeNull();
	});

	it('does not arm a 30s token-refresh ticker (custom schema)', async () => {
		const client = createSupabaseClient(credentials, 'myschema');

		await getAuthInternals(client).initialize();

		expect(getAuthInternals(client).autoRefreshTicker).toBeNull();
	});
});
