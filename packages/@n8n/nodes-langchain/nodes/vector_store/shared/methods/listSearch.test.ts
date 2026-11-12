import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';
import type { WeaviateClient } from 'weaviate-client';

import { createWeaviateClient } from '../../VectorStoreWeaviate/Weaviate.utils';
import { weaviateCollectionsSearch } from './listSearch';

vi.mock('../../VectorStoreWeaviate/Weaviate.utils', () => ({ createWeaviateClient: vi.fn() }));

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
