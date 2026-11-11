import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { execute } from '../../../actions/attachment/delete.operation';
import { confluenceApiRequest } from '../../../transport';
import { mockExecuteCtx, testNode } from '../../shared';

vi.mock('../../../transport', () => ({
	CONFLUENCE_CREDENTIAL_NAME: 'confluenceCloudOAuth2Api',
	confluenceApiRequest: vi.fn(),
}));

const apiRequest = vi.mocked(confluenceApiRequest);

const ENDPOINT = '/wiki/api/v2/attachments/att123';

const baseParams: Record<string, unknown> = {
	resource: 'attachment',
	operation: 'delete',
	attachmentId: 'att123',
	purge: false,
};

function apiError(httpCode: string) {
	return new NodeApiError(testNode, { message: 'boom' }, { httpCode });
}

async function runDelete(overrides: Record<string, unknown> = {}) {
	const ctx = mockExecuteCtx({ ...baseParams, ...overrides });
	return await execute.call(ctx, 0);
}

describe('attachment:delete', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// The v2 endpoint answers 204 with an empty body
		apiRequest.mockResolvedValue('' as never);
	});

	it('moves the attachment to trash and reports the outcome', async () => {
		const result = await runDelete();

		expect(apiRequest).toHaveBeenCalledWith('DELETE', ENDPOINT);
		expect(result).toEqual({ deleted: true, attachmentId: 'att123', purged: false });
	});

	it('trims a padded ID before building the endpoint', async () => {
		const result = await runDelete({ attachmentId: '  att123  ' });

		expect(apiRequest).toHaveBeenCalledWith('DELETE', ENDPOINT);
		expect(result).toEqual({ deleted: true, attachmentId: 'att123', purged: false });
	});

	it.each([
		['empty', ''],
		['whitespace only', '   '],
	])('rejects an %s ID without calling the API', async (_label, attachmentId) => {
		const promise = runDelete({ attachmentId });

		await expect(promise).rejects.toThrow(NodeOperationError);
		await expect(promise).rejects.toThrow("The 'Attachment ID' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('explains a 404 from the plain delete instead of leaking the API error', async () => {
		apiRequest.mockRejectedValue(apiError('404'));

		const promise = runDelete();

		await expect(promise).rejects.toThrow(NodeOperationError);
		await expect(promise).rejects.toThrow('Confluence could not delete the attachment');
	});

	it('rethrows a non-404 failure from the plain delete untouched', async () => {
		apiRequest.mockRejectedValue(apiError('500'));

		await expect(runDelete()).rejects.toThrow(NodeApiError);
	});

	describe('when purging', () => {
		it('trashes first, then purges in a second request', async () => {
			const result = await runDelete({ purge: true });

			expect(apiRequest).toHaveBeenCalledTimes(2);
			expect(apiRequest).toHaveBeenNthCalledWith(1, 'DELETE', ENDPOINT);
			expect(apiRequest).toHaveBeenNthCalledWith(2, 'DELETE', ENDPOINT, {}, { purge: true });
			expect(result).toEqual({ deleted: true, attachmentId: 'att123', purged: true });
		});

		it('still purges an attachment that is already in the trash', async () => {
			// A trashed attachment 404s on the plain delete; the purge must still run
			apiRequest.mockRejectedValueOnce(apiError('404')).mockResolvedValueOnce('' as never);

			const result = await runDelete({ purge: true });

			expect(apiRequest).toHaveBeenNthCalledWith(2, 'DELETE', ENDPOINT, {}, { purge: true });
			expect(result).toEqual({ deleted: true, attachmentId: 'att123', purged: true });
		});

		// The endpoint documents no 403, so the partial state must be reported
		// whatever Confluence answers with, not just for one status code
		it.each(['403', '404', '500'])(
			'reports the trashed-but-not-purged state when the purge fails with %s, given a confirmed trash',
			async (httpCode) => {
				apiRequest.mockResolvedValueOnce('' as never).mockRejectedValueOnce(apiError(httpCode));

				const promise = runDelete({ purge: true });

				await expect(promise).rejects.toThrow(NodeOperationError);
				await expect(promise).rejects.toThrow(
					'The attachment was moved to trash, but could not be purged',
				);
			},
		);

		// A 404 on the plain delete while purging could mean "already trashed" or
		// "wrong ID" or "no permission" — if the purge then also fails, claiming the
		// attachment is safely in the trash would be false for the latter two cases
		it('does not claim the attachment is trashed when the trash step itself was only assumed', async () => {
			apiRequest.mockRejectedValueOnce(apiError('404')).mockRejectedValueOnce(apiError('404'));

			const promise = runDelete({ purge: true });

			await expect(promise).rejects.toThrow(NodeOperationError);
			await expect(promise).rejects.toThrow(
				'Confluence could not permanently delete the attachment',
			);
			await expect(promise).rejects.not.toThrow('was moved to trash');
		});
	});

	// A destructive, irreversible flag must fail closed: anything that is not
	// boolean true leaves the attachment recoverable in the trash
	it.each([
		['the string "false"', 'false'],
		['the string "true"', 'true'],
		['undefined', undefined],
	])('does not purge when the toggle resolves to %s', async (_label, purge) => {
		const result = await runDelete({ purge });

		expect(apiRequest).toHaveBeenCalledTimes(1);
		expect(apiRequest).toHaveBeenCalledWith('DELETE', ENDPOINT);
		expect(result).toEqual({ deleted: true, attachmentId: 'att123', purged: false });
	});
});
