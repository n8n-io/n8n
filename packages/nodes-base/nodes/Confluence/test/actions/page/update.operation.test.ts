import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import type { Mock } from 'vitest';

import { execute } from '../../../actions/page/update.operation';
import { confluenceApiRequest } from '../../../transport';
import { mockExecuteCtx, testNode } from '../../shared';

vi.mock('../../../transport', async (importOriginal) => ({
	...(await importOriginal<object>()),
	confluenceApiRequest: vi.fn(),
}));

const apiRequest = confluenceApiRequest as unknown as Mock;

const baseParams: Record<string, unknown> = {
	page: { mode: 'id', value: '123' },
	title: 'New Title',
	bodyFormat: 'plainText',
	bodyPlainText: 'Hello',
};

const currentPage = {
	id: '123',
	status: 'current',
	title: 'Old Title',
	version: { number: 4 },
};

describe('page:update', () => {
	beforeEach(() => {
		// mockReset (not clearAllMocks) so unconsumed once-queues never leak across tests
		apiRequest.mockReset();
		apiRequest.mockResolvedValueOnce(currentPage).mockResolvedValueOnce({ id: '123' });
	});

	it('fetches the page and PUTs the new title and body with the incremented version', async () => {
		const result = await execute.call(mockExecuteCtx(baseParams), 0);

		expect(apiRequest).toHaveBeenNthCalledWith(1, 'GET', '/wiki/api/v2/pages/123', {}, {});
		expect(apiRequest).toHaveBeenNthCalledWith(2, 'PUT', '/wiki/api/v2/pages/123', {
			id: '123',
			status: 'current',
			title: 'New Title',
			body: { representation: 'storage', value: '<p>Hello</p>' },
			version: { number: 5 },
		});
		expect(result).toEqual({ id: '123' });
	});

	it.each([
		['keeps the current title when Title is empty', { title: '' }, { title: 'Old Title' }],
		['trims the title', { title: '  Padded  ' }, { title: 'Padded' }],
		['coerces a non-string title from an expression', { title: 32 }, { title: '32' }],
		[
			'passes a storage body through unchanged',
			{ bodyFormat: 'storage', bodyStorage: '<h2>H</h2>' },
			{ body: { representation: 'storage', value: '<h2>H</h2>' } },
		],
	])('%s', async (_name, overrides, expectedBody) => {
		await execute.call(mockExecuteCtx({ ...baseParams, ...overrides }), 0);

		const [, , body] = apiRequest.mock.calls[1];
		expect(body).toMatchObject(expectedBody);
	});

	it('echoes the draft status back so updating a draft does not publish it', async () => {
		apiRequest.mockReset();
		apiRequest
			.mockResolvedValueOnce({ ...currentPage, status: 'draft', version: { number: 1 } })
			.mockResolvedValueOnce({ id: '123' });

		await execute.call(mockExecuteCtx(baseParams), 0);

		const [, , body] = apiRequest.mock.calls[1];
		expect(body).toMatchObject({ status: 'draft', version: { number: 1 } });
	});

	it.each([
		['publishes a draft when Status is Published', 'draft', 'current', 1],
		['saves a published page as a draft when Status is Draft', 'current', 'draft', 1],
		['keeps the fetched status when Status is Keep Current Status', 'draft', 'keep', 1],
		['increments the version for a published-to-published update', 'current', 'current', 5],
	])('%s', async (_name, fetchedStatus, statusChoice, expectedVersion) => {
		apiRequest.mockReset();
		apiRequest
			.mockResolvedValueOnce({ ...currentPage, status: fetchedStatus })
			.mockResolvedValueOnce({ id: '123' });

		await execute.call(mockExecuteCtx({ ...baseParams, status: statusChoice }), 0);

		const [, , body] = apiRequest.mock.calls[1];
		expect(body).toMatchObject({
			status: statusChoice === 'keep' ? fetchedStatus : statusChoice,
			version: { number: expectedVersion },
		});
	});

	it('publishes a draft while keeping its content and single version', async () => {
		apiRequest.mockReset();
		apiRequest
			.mockResolvedValueOnce({
				id: '123',
				status: 'draft',
				title: 'Draft Title',
				version: { number: 1 },
				body: { storage: { value: '<p>Existing</p>' } },
			})
			.mockResolvedValueOnce({ id: '123' });

		await execute.call(
			mockExecuteCtx({ ...baseParams, title: '', bodyPlainText: '', status: 'current' }),
			0,
		);

		expect(apiRequest).toHaveBeenNthCalledWith(
			1,
			'GET',
			'/wiki/api/v2/pages/123',
			{},
			{ 'body-format': 'storage' },
		);
		expect(apiRequest).toHaveBeenNthCalledWith(2, 'PUT', '/wiki/api/v2/pages/123', {
			id: '123',
			status: 'current',
			title: 'Draft Title',
			body: { representation: 'storage', value: '<p>Existing</p>' },
			version: { number: 1 },
		});
	});

	it.each([
		['an empty plain text', { bodyFormat: 'plainText', bodyPlainText: '' }],
		['a whitespace-only storage', { bodyFormat: 'storage', bodyStorage: '  ' }],
		['an empty ADF', { bodyFormat: 'atlas_doc_format', bodyAdf: '' }],
	])('keeps the current content when %s body is provided', async (_name, overrides) => {
		apiRequest.mockReset();
		apiRequest
			.mockResolvedValueOnce({ ...currentPage, body: { storage: { value: '<p>Existing</p>' } } })
			.mockResolvedValueOnce({ id: '123' });

		await execute.call(mockExecuteCtx({ ...baseParams, ...overrides }), 0);

		expect(apiRequest).toHaveBeenNthCalledWith(
			1,
			'GET',
			'/wiki/api/v2/pages/123',
			{},
			{ 'body-format': 'storage' },
		);
		const [, , body] = apiRequest.mock.calls[1];
		expect(body).toMatchObject({
			body: { representation: 'storage', value: '<p>Existing</p>' },
			version: { number: 5 },
		});
	});

	it.each(['archived', 'trashed'])(
		'refuses to write to a page whose status is %s',
		async (status) => {
			apiRequest.mockReset();
			apiRequest.mockResolvedValueOnce({ ...currentPage, status });

			await expect(execute.call(mockExecuteCtx(baseParams), 0)).rejects.toThrow(
				`The page cannot be changed because its status is "${status}"`,
			);
			expect(apiRequest).toHaveBeenCalledTimes(1);
		},
	);

	it('surfaces a stale-version 409 as a clear concurrent-edit error', async () => {
		apiRequest.mockReset();
		apiRequest
			.mockResolvedValueOnce(currentPage)
			.mockRejectedValueOnce(
				new NodeApiError(testNode, { message: 'conflict' }, { httpCode: '409' }),
			);

		const error = await execute
			.call(mockExecuteCtx(baseParams), 0)
			.then(() => null)
			.catch((thrown: NodeOperationError) => thrown);

		expect(error).toBeInstanceOf(NodeOperationError);
		expect(error?.message).toBe('The page was modified concurrently');
		expect(error?.description).toContain('run the node again');
	});

	it('passes a non-409 PUT error through unchanged', async () => {
		const thrown = new NodeApiError(testNode, { message: 'x' }, { httpCode: '400' });
		apiRequest.mockReset();
		apiRequest.mockResolvedValueOnce(currentPage).mockRejectedValueOnce(thrown);

		await expect(execute.call(mockExecuteCtx(baseParams), 0)).rejects.toBe(thrown);
	});

	it('resolves a By Title page reference before writing', async () => {
		apiRequest.mockReset();
		apiRequest
			.mockResolvedValueOnce({ results: [{ id: '123', title: 'Old Title', spaceId: '9' }] })
			.mockResolvedValueOnce(currentPage)
			.mockResolvedValueOnce({ id: '123' });

		await execute.call(
			mockExecuteCtx({ ...baseParams, page: { mode: 'title', value: 'Old Title' } }),
			0,
		);

		expect(apiRequest).toHaveBeenNthCalledWith(
			1,
			'GET',
			'/wiki/api/v2/pages',
			{},
			{ title: 'Old Title', limit: 250 },
		);
		expect(apiRequest).toHaveBeenNthCalledWith(3, 'PUT', '/wiki/api/v2/pages/123', {
			id: '123',
			status: 'current',
			title: 'New Title',
			body: { representation: 'storage', value: '<p>Hello</p>' },
			version: { number: 5 },
		});
	});

	it('rejects a missing page without calling the API', async () => {
		await expect(
			execute.call(mockExecuteCtx({ ...baseParams, page: { mode: 'list', value: '' } }), 0),
		).rejects.toThrow("The 'Page' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('rejects an object title instead of silently keeping the current one', async () => {
		await expect(
			execute.call(mockExecuteCtx({ ...baseParams, title: { some: 'object' } }), 0),
		).rejects.toThrow('New Title must be text');
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('fails clearly when the page version cannot be read', async () => {
		apiRequest.mockReset();
		apiRequest.mockResolvedValueOnce({ id: '123', status: 'current', title: 'Old Title' });

		await expect(execute.call(mockExecuteCtx(baseParams), 0)).rejects.toThrow(
			'Could not read the current version of the page',
		);
		expect(apiRequest).toHaveBeenCalledTimes(1);
	});
});
