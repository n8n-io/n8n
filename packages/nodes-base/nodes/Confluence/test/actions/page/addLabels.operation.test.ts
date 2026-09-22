import { NodeOperationError } from 'n8n-workflow';

import { execute } from '../../../actions/page/addLabels.operation';
import { confluenceApiRequest } from '../../../transport';
import { mockExecuteCtx } from '../../shared';

vi.mock('../../../transport', () => ({
	CONFLUENCE_CREDENTIAL_NAME: 'confluenceCloudOAuth2Api',
	confluenceApiRequest: vi.fn(),
}));

const apiRequest = vi.mocked(confluenceApiRequest);

describe('Confluence page:addLabels operation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		apiRequest.mockResolvedValue({});
	});

	it('posts a single label with the global prefix', async () => {
		const ctx = mockExecuteCtx({ page: { mode: 'id', value: '123' }, labels: 'runbook' });

		await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledTimes(1);
		expect(apiRequest).toHaveBeenCalledWith('POST', '/wiki/rest/api/content/123/label', [
			{ prefix: 'global', name: 'runbook' },
		]);
	});

	it('trims a comma-separated list, drops empties and posts it in one request', async () => {
		const ctx = mockExecuteCtx({
			page: { mode: 'id', value: '123' },
			labels: ' alpha , ,beta, ',
		});

		await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledTimes(1);
		expect(apiRequest).toHaveBeenCalledWith('POST', '/wiki/rest/api/content/123/label', [
			{ prefix: 'global', name: 'alpha' },
			{ prefix: 'global', name: 'beta' },
		]);
	});

	it('returns the label list response unchanged', async () => {
		const response = {
			results: [{ id: '9', name: 'runbook', prefix: 'global', label: 'runbook' }],
			start: 0,
			limit: 200,
			size: 1,
			_links: { base: 'https://example.atlassian.net/wiki' },
		};
		apiRequest.mockResolvedValueOnce(response);
		const ctx = mockExecuteCtx({ page: { mode: 'id', value: '123' }, labels: 'runbook' });

		expect(await execute.call(ctx, 0)).toEqual(response);
	});

	it.each([
		['whitespace only', '   '],
		['an expression resolving to undefined', undefined],
	])('throws without calling the API when the labels input is %s', async (_case, labels) => {
		// By Title, so a guard placed after the page lookup would still issue a request
		const ctx = mockExecuteCtx({ page: { mode: 'title', value: 'Doc' }, labels });

		await expect(execute.call(ctx, 0)).rejects.toThrow(NodeOperationError);
		await expect(execute.call(ctx, 0)).rejects.toThrow("The 'Labels' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('rejects a label containing a space instead of letting Confluence split it', async () => {
		// By Title, so a guard placed after the page lookup would still issue a request
		const ctx = mockExecuteCtx({
			page: { mode: 'title', value: 'Doc' },
			labels: 'runbook, release notes',
		});

		await expect(execute.call(ctx, 0)).rejects.toThrow(NodeOperationError);
		await expect(execute.call(ctx, 0)).rejects.toThrow(
			'The label "release notes" contains a space',
		);
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('resolves a By Title selection to its page ID before posting', async () => {
		apiRequest.mockResolvedValueOnce({ results: [{ id: '777', title: 'Doc', spaceId: '1' }] });
		const ctx = mockExecuteCtx({ page: { mode: 'title', value: 'Doc' }, labels: 'runbook' });

		await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenNthCalledWith(
			1,
			'GET',
			'/wiki/api/v2/pages',
			{},
			{ title: 'Doc', limit: 250 },
		);
		expect(apiRequest).toHaveBeenNthCalledWith(2, 'POST', '/wiki/rest/api/content/777/label', [
			{ prefix: 'global', name: 'runbook' },
		]);
	});
});
