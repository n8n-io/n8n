import { describe, expect, it } from 'vitest';

import { SupabaseVectorStore } from '../vector-stores/supabase';

type AuthInternals = {
	autoRefreshTicker: NodeJS.Timeout | null;
	initialize: () => Promise<unknown>;
};

function getAuthInternals(client: { auth: object }): AuthInternals {
	return client.auth as AuthInternals;
}

describe('SupabaseVectorStore client options', () => {
	it('does not arm a 30s token-refresh ticker', async () => {
		const store = new SupabaseVectorStore('test-store', {
			url: 'https://example.supabase.co',
			apiKey: 'service-role-key',
			tableName: 'docs',
		});

		const client = await (
			store as unknown as {
				getClient(): Promise<{ auth: object }>;
			}
		).getClient();

		await getAuthInternals(client).initialize();

		expect(getAuthInternals(client).autoRefreshTicker).toBeNull();
	});
});
