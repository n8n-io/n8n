vi.mock('@supabase/supabase-js', () => ({
	createClient: vi.fn(),
}));

import { createClient } from '@supabase/supabase-js';

import { createSupabaseClient } from './supabase';

const serverSideAuthOptions = {
	auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
};

describe('createSupabaseClient', () => {
	it('creates a client with server-side auth options', () => {
		createSupabaseClient({
			host: 'https://example.supabase.co',
			serviceRole: 'service-role-key',
		});

		expect(createClient).toHaveBeenCalledWith(
			'https://example.supabase.co',
			'service-role-key',
			serverSideAuthOptions,
		);
	});
});
