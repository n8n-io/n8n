import type { IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { execute } from '../../../actions/page/removeLabel.operation';
import { confluenceApiRequest } from '../../../transport';
import { mockExecuteCtx } from '../../shared';

vi.mock('../../../transport', () => ({
	CONFLUENCE_CREDENTIAL_NAME: 'confluenceCloudOAuth2Api',
	confluenceApiRequest: vi.fn(),
}));

const apiRequest = vi.mocked(confluenceApiRequest);

describe('Confluence page:removeLabel operation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// A 204 with an empty body comes back as '' under `json: true`
		apiRequest.mockResolvedValue('' as unknown as IDataObject);
	});

	it('deletes the trimmed label by name in the query string and reports it', async () => {
		const ctx = mockExecuteCtx({
			page: { mode: 'id', value: '123' },
			labelName: '  runbook  ',
		});

		const result = await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledTimes(1);
		expect(apiRequest).toHaveBeenCalledWith(
			'DELETE',
			'/wiki/rest/api/content/123/label',
			{},
			{ name: 'runbook' },
		);
		expect(result).toEqual({ removed: true, pageId: '123', label: 'runbook' });
	});

	it.each([
		['whitespace only', '   '],
		['an expression resolving to undefined', undefined],
	])('throws without calling the API when the label is %s', async (_case, labelName) => {
		// By Title, so a guard placed after the page lookup would still issue a request
		const ctx = mockExecuteCtx({ page: { mode: 'title', value: 'Doc' }, labelName });

		await expect(execute.call(ctx, 0)).rejects.toThrow(NodeOperationError);
		await expect(execute.call(ctx, 0)).rejects.toThrow("The 'Label' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('rejects a comma-separated list instead of removing nothing', async () => {
		const ctx = mockExecuteCtx({
			page: { mode: 'title', value: 'Doc' },
			labelName: 'qa-alpha, qa-beta',
		});

		await expect(execute.call(ctx, 0)).rejects.toThrow(NodeOperationError);
		await expect(execute.call(ctx, 0)).rejects.toThrow('commas are not allowed');
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('rejects a label containing a space instead of removing nothing', async () => {
		const ctx = mockExecuteCtx({
			page: { mode: 'title', value: 'Doc' },
			labelName: 'release notes',
		});

		await expect(execute.call(ctx, 0)).rejects.toThrow(NodeOperationError);
		await expect(execute.call(ctx, 0)).rejects.toThrow(
			'The label "release notes" contains a space',
		);
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('resolves a By Title selection to its page ID before deleting', async () => {
		apiRequest.mockResolvedValueOnce({ results: [{ id: '777', title: 'Doc', spaceId: '1' }] });
		const ctx = mockExecuteCtx({ page: { mode: 'title', value: 'Doc' }, labelName: 'runbook' });

		const result = await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenNthCalledWith(
			1,
			'GET',
			'/wiki/api/v2/pages',
			{},
			{ title: 'Doc', limit: 250 },
		);
		expect(apiRequest).toHaveBeenNthCalledWith(
			2,
			'DELETE',
			'/wiki/rest/api/content/777/label',
			{},
			{ name: 'runbook' },
		);
		expect(result).toEqual({ removed: true, pageId: '777', label: 'runbook' });
	});

	it('passes a label containing a slash through the query string untouched', async () => {
		const ctx = mockExecuteCtx({ page: { mode: 'id', value: '123' }, labelName: 'team/qa' });

		const result = await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledWith(
			'DELETE',
			'/wiki/rest/api/content/123/label',
			{},
			{ name: 'team/qa' },
		);
		expect(result).toEqual({ removed: true, pageId: '123', label: 'team/qa' });
	});
});
