import type {
	IExecuteFunctions,
	IGetNodeParameterOptions,
	INode,
	INodeParameterResourceLocator,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { execute } from '../../../actions/page/addLabels.operation';
import { confluenceApiRequest } from '../../../transport';

vi.mock('../../../transport', () => ({
	CONFLUENCE_CREDENTIAL_NAME: 'confluenceCloudOAuth2Api',
	confluenceApiRequest: vi.fn(),
}));

const apiRequest = vi.mocked(confluenceApiRequest);

const mockNode: INode = {
	id: 'test-node',
	name: 'Test Confluence Node',
	type: 'n8n-nodes-base.confluence',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

function createContext(params: Record<string, unknown>) {
	const ctx = mockDeep<IExecuteFunctions>();
	ctx.getNode.mockReturnValue(mockNode);
	ctx.getNodeParameter.mockImplementation(
		(name: string, _itemIndex?: number, fallback?: unknown, options?: IGetNodeParameterOptions) => {
			// `in`, not `??`: a parameter whose expression resolves to undefined keeps
			// that value instead of picking up the fallback, as the real context does
			const value = name in params ? params[name] : fallback;
			if (options?.extractValue && value && typeof value === 'object' && 'value' in value) {
				return (value as INodeParameterResourceLocator).value as never;
			}
			return value as never;
		},
	);
	return ctx;
}

describe('Confluence page:addLabels operation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		apiRequest.mockResolvedValue({});
	});

	it('posts a single label with the global prefix', async () => {
		const ctx = createContext({ page: { mode: 'id', value: '123' }, labels: 'runbook' });

		await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledTimes(1);
		expect(apiRequest).toHaveBeenCalledWith('POST', '/wiki/rest/api/content/123/label', [
			{ prefix: 'global', name: 'runbook' },
		]);
	});

	it('trims a comma-separated list, drops empties and posts it in one request', async () => {
		const ctx = createContext({
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
		const ctx = createContext({ page: { mode: 'id', value: '123' }, labels: 'runbook' });

		expect(await execute.call(ctx, 0)).toEqual(response);
	});

	it.each([
		['whitespace only', '   '],
		['a comma-only list', ' , , '],
		['an expression resolving to undefined', undefined],
	])('throws without calling the API when the labels input is %s', async (_case, labels) => {
		// By Title, so a guard placed after the page lookup would still issue a request
		const ctx = createContext({ page: { mode: 'title', value: 'Doc' }, labels });

		await expect(execute.call(ctx, 0)).rejects.toThrow(NodeOperationError);
		await expect(execute.call(ctx, 0)).rejects.toThrow("The 'Labels' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('resolves a By Title selection to its page ID before posting', async () => {
		apiRequest.mockResolvedValueOnce({ results: [{ id: '777', title: 'Doc', spaceId: '1' }] });
		const ctx = createContext({ page: { mode: 'title', value: 'Doc' }, labels: 'runbook' });

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
