import type { IExecuteFunctions, IGetNodeParameterOptions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { execute } from '../../../actions/space/get.operation';
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
			const value = name in params ? params[name] : fallback;
			if (options?.extractValue && value && typeof value === 'object' && 'value' in value) {
				return (value as { value: unknown }).value as never;
			}
			return value as never;
		},
	);
	return ctx;
}

describe('Confluence space:get operation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('fetches the space selected from the list', async () => {
		const space = { id: '98432', key: 'NQK', name: 'Docs', type: 'global', status: 'current' };
		apiRequest.mockResolvedValueOnce(space);
		const ctx = createContext({ space: { mode: 'list', value: '98432' } });

		const result = await execute.call(ctx, 0);

		expect(ctx.getNodeParameter).toHaveBeenCalledWith('space', 0, '', { extractValue: true });
		expect(apiRequest).toHaveBeenCalledWith('GET', '/wiki/api/v2/spaces/98432', {}, {});
		expect(result).toEqual(space);
	});

	it('fetches a space referenced By ID', async () => {
		apiRequest.mockResolvedValueOnce({ id: '111' });
		const ctx = createContext({ space: { mode: 'id', value: '111' } });

		await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledWith('GET', '/wiki/api/v2/spaces/111', {}, {});
	});

	it('passes the description format through when the option is set', async () => {
		apiRequest.mockResolvedValueOnce({ id: '111' });
		const ctx = createContext({
			space: { mode: 'id', value: '111' },
			options: { descriptionFormat: 'view' },
		});

		await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/wiki/api/v2/spaces/111',
			{},
			{ 'description-format': 'view' },
		);
	});

	it('throws when the space reference is empty', async () => {
		const ctx = createContext({ space: { mode: 'id', value: ' ' } });

		await expect(execute.call(ctx, 0)).rejects.toThrow(NodeOperationError);
		await expect(execute.call(ctx, 0)).rejects.toThrow("The 'Space' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});
});
