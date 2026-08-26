import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { clearSpaceKeyCache } from '../../actions/common';
import { getLabels, getPages, searchSpaces, searchSpacesWithAll } from '../../methods/listSearch';
import { confluenceApiRequest } from '../../transport';

vi.mock('../../transport', () => ({
	CONFLUENCE_CREDENTIAL_NAME: 'confluenceCloudOAuth2Api',
	confluenceApiRequest: vi.fn(),
}));

const apiRequest = vi.mocked(confluenceApiRequest);

describe('Confluence listSearch.getPages', () => {
	let ctx: ILoadOptionsFunctions;

	beforeEach(() => {
		vi.clearAllMocks();
		clearSpaceKeyCache();
		ctx = mockDeep<ILoadOptionsFunctions>();
		vi.mocked(ctx.getNode).mockReturnValue({
			id: 'test-node',
			name: 'Test Confluence Node',
			type: 'n8n-nodes-base.confluence',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			credentials: { confluenceCloudOAuth2Api: { id: 'cred-1', name: 'account' } },
		});
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

	it('scopes the search to the selected space and drops the space label', async () => {
		vi.mocked(ctx.getCurrentNodeParameter).mockReturnValue('999');
		apiRequest.mockImplementation(async (_method, endpoint, _body, qs) => {
			if (endpoint === '/wiki/api/v2/spaces/999') return { id: 999, key: 'DOCS' };
			if (endpoint === '/wiki/rest/api/search') {
				const cql = (qs as { cql: string }).cql;
				if (cql === 'type=page AND space = "DOCS" AND title = "plan"') return { results: [] };
				expect(cql).toBe(
					'type=page AND space = "DOCS" AND title ~ "plan*" ORDER BY lastmodified DESC',
				);
				return {
					results: [
						{
							content: { id: 123, title: 'Project Plan' },
							resultGlobalContainer: { title: 'Docs Space' },
						},
					],
				};
			}
			throw new Error(`unexpected endpoint ${endpoint}`);
		});

		const result = await getPages.call(ctx, 'plan');

		expect(ctx.getCurrentNodeParameter).toHaveBeenCalledWith('space', { extractValue: true });
		expect(result.results).toEqual([{ name: 'Project Plan', value: '123', url: undefined }]);

		await getPages.call(ctx, 'plan');
		const spaceLookups = apiRequest.mock.calls.filter(
			([, endpoint]) => endpoint === '/wiki/api/v2/spaces/999',
		);
		expect(spaceLookups).toHaveLength(1);
	});

	it('does not reuse cached space keys across credentials', async () => {
		apiRequest.mockImplementation(async (_method, endpoint) => {
			if (endpoint === '/wiki/api/v2/spaces/999') return { id: 999, key: 'DOCS' };
			if (endpoint === '/wiki/rest/api/search') return { results: [] };
			throw new Error(`unexpected endpoint ${endpoint}`);
		});
		const createCtx = (credentialId: string) => {
			const scopedCtx = mockDeep<ILoadOptionsFunctions>();
			vi.mocked(scopedCtx.getCurrentNodeParameter).mockReturnValue('999');
			scopedCtx.getNode.mockReturnValue({
				id: 'test-node',
				name: 'Test Confluence Node',
				type: 'n8n-nodes-base.confluence',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
				credentials: { confluenceCloudOAuth2Api: { id: credentialId, name: 'account' } },
			});
			return scopedCtx;
		};

		await getPages.call(createCtx('cred-1'));
		await getPages.call(createCtx('cred-1'));
		await getPages.call(createCtx('cred-2'));

		const spaceLookups = apiRequest.mock.calls.filter(
			([, endpoint]) => endpoint === '/wiki/api/v2/spaces/999',
		);
		expect(spaceLookups).toHaveLength(2);
	});

	it('advances the offset even when a page comes back empty with a next link', async () => {
		apiRequest.mockResolvedValueOnce({
			results: [],
			_links: { next: '/rest/api/search?cql=type%3Dpage' },
		});

		const result = await getPages.call(ctx, undefined, '50');

		expect(result.paginationToken).toBe('51');
	});

	it('escapes quotes and backslashes in the CQL title filter', async () => {
		apiRequest.mockResolvedValue({ results: [] });

		await getPages.call(ctx, 'He said "hi" \\ back');

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/wiki/rest/api/search',
			{},
			expect.objectContaining({
				cql: 'type=page AND title = "He said \\"hi\\" \\\\ back"',
			}),
		);
		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/wiki/rest/api/search',
			{},
			expect.objectContaining({
				cql: 'type=page AND title ~ "He said \\"hi\\" \\\\ back*" ORDER BY lastmodified DESC',
			}),
		);
	});

	it('puts the exact-title match ahead of prefix matches on the first page', async () => {
		apiRequest.mockImplementation(async (_method, endpoint, _body, qs) => {
			if (endpoint !== '/wiki/rest/api/search') throw new Error(`unexpected endpoint ${endpoint}`);
			const cql = (qs as { cql: string }).cql;
			if (cql === 'type=page AND title = "Notes"') {
				return { results: [{ content: { id: 1, title: 'Notes' } }] };
			}
			expect(cql).toBe('type=page AND title ~ "Notes*" ORDER BY lastmodified DESC');
			return {
				results: [
					{ content: { id: 2, title: 'Notes 2026' } },
					{ content: { id: 1, title: 'Notes' } },
				],
			};
		});

		const result = await getPages.call(ctx, 'Notes');

		expect(result.results.map((item) => item.value)).toEqual(['1', '2']);
	});

	it('skips the exact-title query on later pages', async () => {
		apiRequest.mockResolvedValue({ results: [] });

		await getPages.call(ctx, 'Notes', '50');

		expect(apiRequest).toHaveBeenCalledTimes(1);
		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/wiki/rest/api/search',
			{},
			expect.objectContaining({ start: 50 }),
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

describe('Confluence listSearch.searchSpaces', () => {
	let ctx: ILoadOptionsFunctions;

	beforeEach(() => {
		vi.clearAllMocks();
		ctx = mockDeep<ILoadOptionsFunctions>();
	});

	it('lists current spaces sorted by name, labeled with their key', async () => {
		apiRequest.mockResolvedValueOnce({
			results: [
				{ id: 1, name: 'Docs', key: 'DOCS' },
				{ name: 'entry without id is skipped' },
				{ id: 2, name: 'Engineering' },
			],
		});

		const result = await searchSpaces.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/wiki/api/v2/spaces',
			{},
			{ limit: 50, sort: 'name', status: 'current' },
		);
		expect(result).toEqual({
			results: [
				{ name: 'Docs (DOCS)', value: '1' },
				{ name: 'Engineering', value: '2' },
			],
			paginationToken: undefined,
		});
	});

	it('filters the typed text client-side, case-insensitively', async () => {
		apiRequest.mockResolvedValueOnce({
			results: [
				{ id: 1, name: 'Docs', key: 'DOCS' },
				{ id: 2, name: 'Engineering' },
			],
		});

		const result = await searchSpaces.call(ctx, 'doc');

		expect(result.results).toEqual([{ name: 'Docs (DOCS)', value: '1' }]);
	});

	it('prepends All Spaces only on the unfiltered first page of the WithAll variant', async () => {
		apiRequest.mockResolvedValue({ results: [{ id: 1, name: 'Docs', key: 'DOCS' }] });

		const first = await searchSpacesWithAll.call(ctx);
		expect(first.results[0]).toEqual({ name: 'All Spaces', value: '' });

		const filtered = await searchSpacesWithAll.call(ctx, 'docs');
		expect(filtered.results[0]).toEqual({ name: 'Docs (DOCS)', value: '1' });

		const paged = await searchSpacesWithAll.call(ctx, undefined, 'abc');
		expect(paged.results[0]).toEqual({ name: 'Docs (DOCS)', value: '1' });
	});

	it('keeps fetching pages while a typed filter has no match yet', async () => {
		apiRequest
			.mockResolvedValueOnce({
				results: [{ id: 1, name: 'Docs', key: 'DOCS' }],
				_links: { next: '/wiki/api/v2/spaces?cursor=c2' },
			})
			.mockResolvedValueOnce({
				results: [{ id: 3, name: 'Sales' }],
			});

		const result = await searchSpaces.call(ctx, 'sales');

		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(apiRequest).toHaveBeenNthCalledWith(
			2,
			'GET',
			'/wiki/api/v2/spaces',
			{},
			expect.objectContaining({ cursor: 'c2' }),
		);
		expect(result).toEqual({
			results: [{ name: 'Sales', value: '3' }],
			paginationToken: undefined,
		});
	});

	it('resumes from the pagination cursor and returns the next one', async () => {
		apiRequest.mockResolvedValueOnce({
			results: [{ id: 3, name: 'Sales' }],
			_links: { next: '/wiki/api/v2/spaces?cursor=xyz%3D%3D' },
		});

		const result = await searchSpaces.call(ctx, undefined, 'abc==');

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/wiki/api/v2/spaces',
			{},
			expect.objectContaining({ cursor: 'abc==' }),
		);
		expect(result.paginationToken).toBe('xyz==');
	});
});

describe('Confluence listSearch.getLabels', () => {
	let ctx: ILoadOptionsFunctions;

	beforeEach(() => {
		vi.clearAllMocks();
		ctx = mockDeep<ILoadOptionsFunctions>();
	});

	it('lists labels sorted by name, marking non-global prefixes', async () => {
		apiRequest.mockResolvedValueOnce({
			results: [
				{ id: 1, name: 'runbook', prefix: 'global' },
				{ name: 'entry without id is skipped' },
				{ id: 2, name: 'favourite', prefix: 'my' },
			],
		});

		const result = await getLabels.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/wiki/api/v2/labels',
			{},
			{ limit: 50, sort: 'name' },
		);
		expect(result.results.map(({ name, value }) => [name, value])).toEqual([
			['runbook', '1'],
			['favourite (my)', '2'],
		]);
		expect(result.paginationToken).toBeUndefined();
	});

	it('filters the typed text client-side, case-insensitively', async () => {
		apiRequest.mockResolvedValueOnce({
			results: [
				{ id: 1, name: 'runbook', prefix: 'global' },
				{ id: 2, name: 'qa-docs', prefix: 'global' },
			],
		});

		const result = await getLabels.call(ctx, 'RUN');

		expect(result.results.map(({ name, value }) => [name, value])).toEqual([['runbook', '1']]);
	});

	it('scans past a partial match while an exact match may lie ahead in the name sort', async () => {
		apiRequest
			.mockResolvedValueOnce({
				results: [{ id: 1, name: 'aqua-qa', prefix: 'global' }],
				_links: { next: '/wiki/api/v2/labels?cursor=c2' },
			})
			.mockResolvedValueOnce({
				results: [{ id: 2, name: 'qa', prefix: 'global' }],
				_links: { next: '/wiki/api/v2/labels?cursor=c3' },
			});

		const result = await getLabels.call(ctx, 'qa');

		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(result.results.map(({ name, value }) => [name, value])).toEqual([
			['aqua-qa', '1'],
			['qa', '2'],
		]);
	});

	it('stops scanning once the name sort has passed the typed text', async () => {
		apiRequest.mockResolvedValueOnce({
			results: [{ id: 1, name: 'runbook', prefix: 'global' }],
			_links: { next: '/wiki/api/v2/labels?cursor=c2' },
		});

		const result = await getLabels.call(ctx, 'run');

		expect(apiRequest).toHaveBeenCalledTimes(1);
		expect(result.results.map(({ name, value }) => [name, value])).toEqual([['runbook', '1']]);
		expect(result.paginationToken).toBe('c2');
	});

	it('keeps fetching pages while a typed filter has no match yet', async () => {
		apiRequest
			.mockResolvedValueOnce({
				results: [{ id: 1, name: 'runbook', prefix: 'global' }],
				_links: { next: '/wiki/api/v2/labels?cursor=c2' },
			})
			.mockResolvedValueOnce({
				results: [{ id: 3, name: 'qa-seed', prefix: 'global' }],
			});

		const result = await getLabels.call(ctx, 'qa-seed');

		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(apiRequest).toHaveBeenNthCalledWith(
			2,
			'GET',
			'/wiki/api/v2/labels',
			{},
			expect.objectContaining({ cursor: 'c2' }),
		);
		expect(result).toEqual({
			results: [{ name: 'qa-seed', value: '3' }],
			paginationToken: undefined,
		});
	});

	it('resumes from the pagination cursor and returns the next one', async () => {
		apiRequest.mockResolvedValueOnce({
			results: [{ id: 3, name: 'qa-seed', prefix: 'global' }],
			_links: { next: '/wiki/api/v2/labels?cursor=xyz%3D%3D' },
		});

		const result = await getLabels.call(ctx, undefined, 'abc==');

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/wiki/api/v2/labels',
			{},
			expect.objectContaining({ cursor: 'abc==' }),
		);
		expect(result.paginationToken).toBe('xyz==');
	});
});
