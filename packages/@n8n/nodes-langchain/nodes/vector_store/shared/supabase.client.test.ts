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

describe('createSupabaseClient (real supabase-js)', () => {
	it('does not arm a 30s token-refresh ticker', async () => {
		const client = createSupabaseClient({
			host: 'https://example.supabase.co',
			serviceRole: 'test-service-role-key',
		});

		await getAuthInternals(client).initialize();

		expect(getAuthInternals(client).autoRefreshTicker).toBeNull();
	});
});
