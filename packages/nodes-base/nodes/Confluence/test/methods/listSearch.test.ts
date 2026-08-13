import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { getPages } from '../../methods/listSearch';
import { confluenceApiRequest } from '../../transport';

vi.mock('../../transport', () => ({
	confluenceApiRequest: vi.fn(),
}));

const apiRequest = vi.mocked(confluenceApiRequest);

describe('Confluence listSearch.getPages', () => {
	let ctx: ILoadOptionsFunctions;

	beforeEach(() => {
		vi.clearAllMocks();
		ctx = mockDeep<ILoadOptionsFunctions>();
	});

	it('lists recently modified pages when no filter is given', async () => {
		apiRequest.mockResolvedValueOnce({
			_links: { base: 'https://example.atlassian.net/wiki' },
			results: [
				{
					content: { id: 123, title: 'Doc', _links: { webui: '/spaces/D/pages/123' } },
					resultGlobalContainer: { title: 'Docs Space' },
				},
				{ title: 'entry without content is skipped' },
				{ content: { id: 456 } },
			],
		});

		const result = await getPages.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/wiki/rest/api/search',
			{},
			{ cql: 'type=page ORDER BY lastmodified DESC', limit: 50, start: 0 },
		);
		expect(result).toEqual({
			results: [
				{
					name: 'Doc (Docs Space)',
					value: '123',
					url: 'https://example.atlassian.net/wiki/spaces/D/pages/123',
				},
				// Title falls back to the ID, no space suffix, no URL without webui link
				{ name: '456', value: '456', url: undefined },
			],
			paginationToken: undefined,
		});
	});

	it('escapes quotes and backslashes in the CQL title filter', async () => {
		apiRequest.mockResolvedValueOnce({ results: [] });

		await getPages.call(ctx, 'He said "hi" \\ back');

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/wiki/rest/api/search',
			{},
			expect.objectContaining({
				cql: 'type=page AND title ~ "He said \\"hi\\" \\\\ back*" ORDER BY lastmodified DESC',
			}),
		);
	});

	it('resumes from the pagination token and returns the next one while more pages exist', async () => {
		apiRequest.mockResolvedValueOnce({
			_links: { next: '/rest/api/search?cql=…&start=52' },
			results: [{ content: { id: 1 } }, { content: { id: 2 } }],
		});

		const result = await getPages.call(ctx, undefined, '50');

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/wiki/rest/api/search',
			{},
			expect.objectContaining({ start: 50 }),
		);
		expect(result.paginationToken).toBe('52');
	});
});
