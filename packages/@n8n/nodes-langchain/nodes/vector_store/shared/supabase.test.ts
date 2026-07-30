const createClientMock = vi.hoisted(() => vi.fn());

vi.mock('@supabase/supabase-js', () => ({
	createClient: createClientMock,
}));

import { createSupabaseClient } from './supabase';

describe('createSupabaseClient', () => {
	it('should disable client-side auth features', () => {
		const client = {};
		createClientMock.mockReturnValue(client);

		const result = createSupabaseClient({
			host: 'https://example.supabase.co',
			serviceRole: 'service-role-key',
		});

		expect(createClientMock).toHaveBeenCalledWith(
			'https://example.supabase.co',
			'service-role-key',
			{
				auth: {
					autoRefreshToken: false,
					persistSession: false,
				},
			},
		);
		expect(result).toBe(client);
	});
});
