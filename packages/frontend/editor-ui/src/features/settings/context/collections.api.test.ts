import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

import { createCollection } from './collections.api';

vi.mock('@n8n/rest-api-client', () => ({
	makeRestApiRequest: vi.fn(),
}));

const context = {} as IRestApiContext;

describe('collections.api', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('creates the collection in the project of the URL', async () => {
		const created = { id: 'c1', name: 'Support' };
		vi.mocked(makeRestApiRequest).mockResolvedValue(created);

		await expect(
			createCollection(context, 'proj-1', { name: 'Support', description: 'Refunds' }),
		).resolves.toBe(created);

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'POST',
			'/projects/proj-1/knowledge/collections',
			{ name: 'Support', description: 'Refunds' },
		);
	});
});
