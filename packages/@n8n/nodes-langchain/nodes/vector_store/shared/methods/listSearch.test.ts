import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { mock, mockDeep } from 'vitest-mock-extended';
import type { WeaviateClient } from 'weaviate-client';

import { createWeaviateClient } from '../../VectorStoreWeaviate/Weaviate.utils';
import { supabaseTableNameSearch, weaviateCollectionsSearch } from './listSearch';

vi.mock('../../VectorStoreWeaviate/Weaviate.utils', () => ({ createWeaviateClient: vi.fn() }));

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

describe('weaviateCollectionsSearch', () => {
	it('should list each collection by name', async () => {
		const credentials = { weaviate_cloud_endpoint: 'https://cluster.weaviate.cloud' };
		const context = mock<ILoadOptionsFunctions>();
		context.getCredentials.mockResolvedValue(credentials);
		const listAll = vi.fn().mockResolvedValue([{ name: 'Books' }, { name: 'Films' }]);
		vi.mocked(createWeaviateClient).mockResolvedValue(
			mock<WeaviateClient>({ collections: mock<WeaviateClient['collections']>({ listAll }) }),
		);

		const result = await weaviateCollectionsSearch.call(context);

		expect(context.getCredentials).toHaveBeenCalledWith('weaviateApi');
		expect(createWeaviateClient).toHaveBeenCalledWith(credentials);
		expect(result).toEqual({
			results: [
				{ name: 'Books', value: 'Books' },
				{ name: 'Films', value: 'Films' },
			],
		});
	});
});
