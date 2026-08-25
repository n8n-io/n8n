import type {
	IDataObject,
	IExecuteFunctions,
	IGetNodeParameterOptions,
	INode,
	INodeParameterResourceLocator,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { execute } from '../../../actions/page/removeLabel.operation';
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

describe('Confluence page:removeLabel operation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// A 204 with an empty body comes back as '' under `json: true`
		apiRequest.mockResolvedValue('' as unknown as IDataObject);
	});

	it('deletes the trimmed label by name in the query string and reports it', async () => {
		const ctx = createContext({
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
		const ctx = createContext({ page: { mode: 'title', value: 'Doc' }, labelName });

		await expect(execute.call(ctx, 0)).rejects.toThrow(NodeOperationError);
		await expect(execute.call(ctx, 0)).rejects.toThrow("The 'Label' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('rejects a comma-separated list instead of removing nothing', async () => {
		const ctx = createContext({
			page: { mode: 'title', value: 'Doc' },
			labelName: 'qa-alpha, qa-beta',
		});

		await expect(execute.call(ctx, 0)).rejects.toThrow(NodeOperationError);
		await expect(execute.call(ctx, 0)).rejects.toThrow('commas are not allowed');
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('passes a label containing a slash through the query string untouched', async () => {
		const ctx = createContext({ page: { mode: 'id', value: '123' }, labelName: 'team/qa' });

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
