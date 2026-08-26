import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import type { Mock } from 'vitest';

import { description, execute } from '../../../actions/page/addComment.operation';
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
	bodyPlainText: 'Nice page',
	parentCommentId: '',
};

function notFound(): NodeApiError {
	return new NodeApiError(testNode, { message: 'Not found' }, { httpCode: '404' });
}

describe('page:addComment', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		apiRequest.mockResolvedValue({ id: '555', pageId: '123' });
	});

	it('hides the space and page pickers when a parent comment ID is set', () => {
		// Without the hide, the required page picker blocks reply-only executions
		const hide = { parentCommentId: [{ _cnd: { regex: '\\S' } }] };
		const byName = (name: string) => description.find((property) => property.name === name);

		expect(byName('space')?.displayOptions?.hide).toEqual(hide);
		expect(byName('page')?.displayOptions?.hide).toEqual(hide);
		expect(byName('parentCommentId')?.displayOptions?.hide).toBeUndefined();
	});

	it('posts a top-level comment on the resolved page', async () => {
		const result = await execute.call(mockExecuteCtx(baseParams), 0);

		expect(apiRequest).toHaveBeenCalledWith('POST', '/wiki/api/v2/footer-comments', {
			pageId: '123',
			body: { representation: 'storage', value: '<p>Nice page</p>' },
		});
		expect(result).toEqual({ id: '555', pageId: '123' });
	});

	it('sends parentCommentId instead of pageId when replying, without touching the page', async () => {
		// An empty page reference would make page resolution throw, proving it is skipped
		const ctx = mockExecuteCtx({
			...baseParams,
			page: { mode: 'id', value: '' },
			parentCommentId: '999',
		});

		await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledTimes(1);
		expect(apiRequest).toHaveBeenCalledWith('POST', '/wiki/api/v2/footer-comments', {
			parentCommentId: '999',
			body: { representation: 'storage', value: '<p>Nice page</p>' },
		});
	});

	it('treats a whitespace-only parent comment ID as absent', async () => {
		await execute.call(mockExecuteCtx({ ...baseParams, parentCommentId: '   ' }), 0);

		expect(apiRequest).toHaveBeenCalledWith('POST', '/wiki/api/v2/footer-comments', {
			pageId: '123',
			body: { representation: 'storage', value: '<p>Nice page</p>' },
		});
	});

	it('passes a storage-format body through verbatim', async () => {
		await execute.call(
			mockExecuteCtx({
				...baseParams,
				bodyFormat: 'storage',
				bodyStorage: '<p>Already <b>markup</b></p>',
			}),
			0,
		);

		expect(apiRequest).toHaveBeenCalledWith('POST', '/wiki/api/v2/footer-comments', {
			pageId: '123',
			body: { representation: 'storage', value: '<p>Already <b>markup</b></p>' },
		});
	});

	it('posts an ADF comment whose only content is a non-text node', async () => {
		const bodyAdf = JSON.stringify({
			type: 'doc',
			version: 1,
			content: [{ type: 'paragraph', content: [{ type: 'emoji', attrs: { shortName: ':+1:' } }] }],
		});

		await execute.call(
			mockExecuteCtx({ ...baseParams, bodyFormat: 'atlas_doc_format', bodyAdf }),
			0,
		);

		expect(apiRequest).toHaveBeenCalledWith('POST', '/wiki/api/v2/footer-comments', {
			pageId: '123',
			body: { representation: 'atlas_doc_format', value: bodyAdf },
		});
	});

	it.each([
		['an empty plain-text body', { bodyPlainText: '' }],
		['a whitespace-only plain-text body', { bodyPlainText: '  \n  ' }],
		['an empty storage body', { bodyFormat: 'storage', bodyStorage: '' }],
		[
			// Serializes to non-blank JSON, so a string check alone would let it through
			'an empty ADF document',
			{ bodyFormat: 'atlas_doc_format', bodyAdf: '{"type":"doc","version":1,"content":[]}' },
		],
		[
			'an ADF document with only empty paragraphs',
			{
				bodyFormat: 'atlas_doc_format',
				bodyAdf: '{"type":"doc","version":1,"content":[{"type":"paragraph","content":[]}]}',
			},
		],
	])('rejects %s before calling the API', async (_name, overrides) => {
		const promise = execute.call(mockExecuteCtx({ ...baseParams, ...overrides }), 0);

		await expect(promise).rejects.toThrow(NodeOperationError);
		await expect(promise).rejects.toThrow('The comment body is empty');
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('rejects an invalid ADF body before calling the API', async () => {
		const promise = execute.call(
			mockExecuteCtx({ ...baseParams, bodyFormat: 'atlas_doc_format', bodyAdf: 'not-json' }),
			0,
		);

		await expect(promise).rejects.toThrow(NodeOperationError);
		await expect(promise).rejects.toThrow('ADF JSON body is not valid JSON');
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('maps a 404 on a page comment to view/comment permission guidance', async () => {
		apiRequest.mockRejectedValue(notFound());

		const promise = execute.call(mockExecuteCtx(baseParams), 0);

		await expect(promise).rejects.toThrow(NodeOperationError);
		await expect(promise).rejects.toThrow('Confluence could not add the comment');
		await expect(promise).rejects.toMatchObject({
			description: expect.stringContaining('The page may not exist'),
		});
	});

	it('maps a 404 on a reply to parent-comment guidance', async () => {
		apiRequest.mockRejectedValue(notFound());

		const promise = execute.call(mockExecuteCtx({ ...baseParams, parentCommentId: '999' }), 0);

		await expect(promise).rejects.toThrow('Confluence could not add the comment');
		await expect(promise).rejects.toMatchObject({
			description: expect.stringContaining('The parent comment may not exist'),
		});
	});

	it('rethrows other API errors untouched', async () => {
		const serverError = new NodeApiError(testNode, { message: 'Boom' }, { httpCode: '500' });
		apiRequest.mockRejectedValue(serverError);

		await expect(execute.call(mockExecuteCtx(baseParams), 0)).rejects.toBe(serverError);
	});
});
