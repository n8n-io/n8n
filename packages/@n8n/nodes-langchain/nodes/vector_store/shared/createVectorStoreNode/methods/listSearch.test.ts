import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { supabaseTableNameSearch } from './listSearch';

describe('supabaseTableNameSearch', () => {
	it('should request the REST root of the credential host and list the tables', async () => {
		const ctx = mockDeep<ILoadOptionsFunctions>();
		ctx.getCredentials.mockResolvedValue({ host: 'https://abcdefghijklmnop.supabase.co' });
		ctx.helpers.requestWithAuthentication.mockResolvedValue({
			paths: { '/': {}, '/documents': {}, '/embeddings': {} },
		});

		const result = await supabaseTableNameSearch.call(ctx);

		const [credentialType, options] = ctx.helpers.requestWithAuthentication.mock.calls[0];
		expect(credentialType).toBe('supabaseApi');
		expect(options.method).toBe('GET');
		expect(String(options.uri)).toBe('https://abcdefghijklmnop.supabase.co/rest/v1/');
		expect(result.results.map((table) => table.value)).toEqual(['documents', 'embeddings']);
	});
});
