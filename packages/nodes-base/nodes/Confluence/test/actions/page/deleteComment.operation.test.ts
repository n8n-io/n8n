import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import type { Mock } from 'vitest';

import { execute } from '../../../actions/page/deleteComment.operation';
import { confluenceApiRequest } from '../../../transport';
import { mockExecuteCtx, testNode } from '../../shared';

vi.mock('../../../transport', async (importOriginal) => ({
	...(await importOriginal<object>()),
	confluenceApiRequest: vi.fn(),
}));

const apiRequest = confluenceApiRequest as unknown as Mock;

describe('page:deleteComment', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		apiRequest.mockResolvedValue({});
	});

	it('deletes the comment and returns a deletion report', async () => {
		const result = await execute.call(mockExecuteCtx({ commentId: '555' }), 0);

		expect(apiRequest).toHaveBeenCalledWith('DELETE', '/wiki/api/v2/footer-comments/555');
		expect(result).toEqual({ deleted: true, commentId: '555' });
	});

	it('trims and URL-encodes the comment ID', async () => {
		const result = await execute.call(mockExecuteCtx({ commentId: ' 555/6 ' }), 0);

		expect(apiRequest).toHaveBeenCalledWith('DELETE', '/wiki/api/v2/footer-comments/555%2F6');
		expect(result).toEqual({ deleted: true, commentId: '555/6' });
	});

	it('rejects an empty comment ID before calling the API', async () => {
		const promise = execute.call(mockExecuteCtx({ commentId: '   ' }), 0);

		await expect(promise).rejects.toThrow(NodeOperationError);
		await expect(promise).rejects.toThrow("The 'Comment ID' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('maps a 404 to not-found/permission guidance', async () => {
		apiRequest.mockRejectedValue(
			new NodeApiError(testNode, { message: 'Not found' }, { httpCode: '404' }),
		);

		const promise = execute.call(mockExecuteCtx({ commentId: '555' }), 0);

		await expect(promise).rejects.toThrow(NodeOperationError);
		await expect(promise).rejects.toThrow('Confluence could not delete the comment');
		await expect(promise).rejects.toMatchObject({
			description: expect.stringContaining('The comment may not exist'),
		});
	});

	it('rethrows other API errors untouched', async () => {
		const serverError = new NodeApiError(testNode, { message: 'Boom' }, { httpCode: '500' });
		apiRequest.mockRejectedValue(serverError);

		await expect(execute.call(mockExecuteCtx({ commentId: '555' }), 0)).rejects.toBe(serverError);
	});
});
