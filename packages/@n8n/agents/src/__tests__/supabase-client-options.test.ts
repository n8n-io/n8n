vi.mock('@supabase/supabase-js', () => ({
	createClient: vi.fn(() => ({
		from: vi.fn(() => ({
			upsert: vi.fn().mockResolvedValue({ error: null }),
		})),
	})),
}));

import { createClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { SupabaseVectorStore } from '../vector-stores/supabase';

const serverSideAuthOptions = {
	auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
};

describe('SupabaseVectorStore client options', () => {
	it('creates the client with server-side auth options', async () => {
		const store = new SupabaseVectorStore('test-store', {
			url: 'https://example.supabase.co',
			apiKey: 'service-role-key',
			tableName: 'docs',
		});

		await store.upsert([{ id: '1', vector: [1], content: 'x', metadata: {} }]);

		expect(createClient).toHaveBeenCalledWith(
			'https://example.supabase.co',
			'service-role-key',
			serverSideAuthOptions,
		);
	});
});
