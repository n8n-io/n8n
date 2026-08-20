import { jsonParse, NodeApiError, NodeOperationError } from 'n8n-workflow';
import type { Mock } from 'vitest';

import { execute, mergeAdfDocuments } from '../../../actions/page/append.operation';
import { confluenceApiRequest } from '../../../transport';
import { mockExecuteCtx, testNode } from '../../shared';

vi.mock('../../../transport', async (importOriginal) => ({
	...(await importOriginal<object>()),
	confluenceApiRequest: vi.fn(),
}));

const apiRequest = confluenceApiRequest as unknown as Mock;

const baseParams: Record<string, unknown> = {
	page: { mode: 'id', value: '123' },
	bodyFormat: 'plainText',
	bodyPlainText: 'More',
};

const storagePage = {
	id: '123',
	status: 'current',
	title: 'Doc',
	version: { number: 2 },
	body: { storage: { value: '<p>Old</p>' } },
};

const adfDoc = (content: unknown[]) => ({ type: 'doc', version: 1, content });

const adfPage = {
	...storagePage,
	body: { atlas_doc_format: { value: JSON.stringify(adfDoc([{ type: 'paragraph' }])) } },
};

describe('page:append', () => {
	beforeEach(() => {
		// mockReset (not clearAllMocks) so unconsumed once-queues never leak across tests
		apiRequest.mockReset();
	});

	it('fetches the storage body and PUTs the concatenation with the incremented version', async () => {
		apiRequest.mockResolvedValueOnce(storagePage).mockResolvedValueOnce({ id: '123' });

		const result = await execute.call(mockExecuteCtx(baseParams), 0);

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
			title: 'Doc',
			body: { representation: 'storage', value: '<p>Old</p><p>More</p>' },
			version: { number: 3 },
		});
		expect(result).toEqual({ id: '123' });
	});

	it('concatenates a storage input onto the fetched storage body', async () => {
		apiRequest.mockResolvedValueOnce(storagePage).mockResolvedValueOnce({ id: '123' });

		await execute.call(
			mockExecuteCtx({ ...baseParams, bodyFormat: 'storage', bodyStorage: '<h2>New</h2>' }),
			0,
		);

		const [, , body] = apiRequest.mock.calls[1];
		expect(body).toMatchObject({
			body: { representation: 'storage', value: '<p>Old</p><h2>New</h2>' },
		});
	});

	it('appends onto an empty page body', async () => {
		apiRequest
			.mockResolvedValueOnce({ ...storagePage, body: { storage: { value: '' } } })
			.mockResolvedValueOnce({ id: '123' });

		await execute.call(mockExecuteCtx(baseParams), 0);

		const [, , body] = apiRequest.mock.calls[1];
		expect(body).toMatchObject({ body: { representation: 'storage', value: '<p>More</p>' } });
	});

	it('fails without saving when the response lacks the requested representation', async () => {
		apiRequest.mockResolvedValueOnce({ ...storagePage, body: {} });

		await expect(execute.call(mockExecuteCtx(baseParams), 0)).rejects.toThrow(
			'Could not read the current content of the page',
		);
		expect(apiRequest).toHaveBeenCalledTimes(1);
	});

	it('merges an ADF input by concatenating the documents content arrays', async () => {
		apiRequest.mockResolvedValueOnce(adfPage).mockResolvedValueOnce({ id: '123' });

		await execute.call(
			mockExecuteCtx({
				...baseParams,
				bodyFormat: 'atlas_doc_format',
				bodyAdf: JSON.stringify(adfDoc([{ type: 'heading' }])),
			}),
			0,
		);

		expect(apiRequest).toHaveBeenNthCalledWith(
			1,
			'GET',
			'/wiki/api/v2/pages/123',
			{},
			{ 'body-format': 'atlas_doc_format' },
		);
		expect(apiRequest).toHaveBeenNthCalledWith(2, 'PUT', '/wiki/api/v2/pages/123', {
			id: '123',
			status: 'current',
			title: 'Doc',
			body: {
				representation: 'atlas_doc_format',
				value: JSON.stringify(adfDoc([{ type: 'paragraph' }, { type: 'heading' }])),
			},
			version: { number: 3 },
		});
	});

	it('uses the ADF input as the whole body when the page body is empty', async () => {
		apiRequest
			.mockResolvedValueOnce({ ...storagePage, body: { atlas_doc_format: { value: '' } } })
			.mockResolvedValueOnce({ id: '123' });

		await execute.call(
			mockExecuteCtx({
				...baseParams,
				bodyFormat: 'atlas_doc_format',
				bodyAdf: JSON.stringify(adfDoc([{ type: 'heading' }])),
			}),
			0,
		);

		expect(apiRequest).toHaveBeenNthCalledWith(2, 'PUT', '/wiki/api/v2/pages/123', {
			id: '123',
			status: 'current',
			title: 'Doc',
			body: {
				representation: 'atlas_doc_format',
				value: JSON.stringify(adfDoc([{ type: 'heading' }])),
			},
			version: { number: 3 },
		});
	});

	it('rejects an ADF input without a content array before calling the API', async () => {
		await expect(
			execute.call(
				mockExecuteCtx({
					...baseParams,
					bodyFormat: 'atlas_doc_format',
					bodyAdf: '{ "type": "doc", "version": 1 }',
				}),
				0,
			),
		).rejects.toThrow('ADF JSON body must be a document with a "content" array');
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('fails clearly when the current ADF body cannot be parsed, without saving', async () => {
		apiRequest.mockResolvedValueOnce({
			...storagePage,
			body: { atlas_doc_format: { value: 'not json' } },
		});

		await expect(
			execute.call(
				mockExecuteCtx({
					...baseParams,
					bodyFormat: 'atlas_doc_format',
					bodyAdf: JSON.stringify(adfDoc([])),
				}),
				0,
			),
		).rejects.toThrow('The current body of the page could not be read as an ADF document');
		expect(apiRequest).toHaveBeenCalledTimes(1);
	});

	it('surfaces a stale-version 409 as a clear concurrent-edit error', async () => {
		apiRequest
			.mockResolvedValueOnce(storagePage)
			.mockRejectedValueOnce(
				new NodeApiError(testNode, { message: 'conflict' }, { httpCode: '409' }),
			);

		const error = await execute
			.call(mockExecuteCtx(baseParams), 0)
			.then(() => null)
			.catch((thrown: NodeOperationError) => thrown);

		expect(error).toBeInstanceOf(NodeOperationError);
		expect(error?.message).toBe('The page was modified concurrently');
	});

	it('does not increment the version when appending to a draft', async () => {
		apiRequest
			.mockResolvedValueOnce({ ...storagePage, status: 'draft', version: { number: 1 } })
			.mockResolvedValueOnce({ id: '123' });

		await execute.call(mockExecuteCtx(baseParams), 0);

		const [, , body] = apiRequest.mock.calls[1];
		expect(body).toMatchObject({ status: 'draft', version: { number: 1 } });
	});

	it('refuses to append to a trashed page instead of restoring it', async () => {
		apiRequest.mockResolvedValueOnce({ ...storagePage, status: 'trashed' });

		await expect(execute.call(mockExecuteCtx(baseParams), 0)).rejects.toThrow(
			'The page cannot be changed because its status is "trashed"',
		);
		expect(apiRequest).toHaveBeenCalledTimes(1);
	});

	it('rejects a missing page without calling the API', async () => {
		await expect(
			execute.call(mockExecuteCtx({ ...baseParams, page: { mode: 'list', value: '' } }), 0),
		).rejects.toThrow("The 'Page' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	describe('mergeAdfDocuments', () => {
		it('preserves the current document envelope and appends the content', () => {
			const merged = jsonParse(
				mergeAdfDocuments(
					JSON.stringify({ ...adfDoc([{ type: 'paragraph' }]), extra: 'kept' }),
					adfDoc([{ type: 'rule' }]),
				),
			);

			expect(merged).toEqual({
				...adfDoc([{ type: 'paragraph' }, { type: 'rule' }]),
				extra: 'kept',
			});
		});

		it('treats a current document without content as empty', () => {
			const merged = jsonParse(
				mergeAdfDocuments(JSON.stringify({ type: 'doc', version: 1 }), adfDoc([{ type: 'rule' }])),
			);

			expect(merged).toEqual(adfDoc([{ type: 'rule' }]));
		});
	});
});
