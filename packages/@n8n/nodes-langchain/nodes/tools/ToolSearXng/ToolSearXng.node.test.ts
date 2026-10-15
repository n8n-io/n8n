import { DynamicTool } from '@langchain/core/tools';
import type {
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	ISupplyDataFunctions,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ToolSearXng } from './ToolSearXng.node';

const SEARXNG_RESPONSE = {
	results: [
		{
			title: 'First result',
			url: 'https://example.com/1',
			content: 'First snippet',
		},
		{
			title: 'Second result',
			url: 'https://example.com/2',
			content: 'Second snippet',
		},
	],
};

function createContext(
	overrides: {
		apiUrl?: string;
		options?: Record<string, unknown>;
		httpResponse?: unknown;
		inputData?: INodeExecutionData[];
	} = {},
) {
	const httpRequest = vi.fn().mockResolvedValue(overrides.httpResponse ?? SEARXNG_RESPONSE);
	const ctx = mock<IExecuteFunctions>({
		getInputData: vi.fn(() => overrides.inputData ?? [{ json: { input: 'test' } }]),
		getNode: vi.fn(() => mock<INode>({ name: 'test searxng' })),
		getCredentials: vi
			.fn()
			.mockResolvedValue({ apiUrl: overrides.apiUrl ?? 'https://searx.example.com' }),
		getNodeParameter: vi.fn().mockReturnValue(overrides.options ?? {}),
		addInputData: vi.fn().mockReturnValue({ index: 0 }),
		addOutputData: vi.fn(),
	});
	ctx.helpers.httpRequest = httpRequest;
	return { ctx, httpRequest };
}

describe('ToolSearXng', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('supplyData', () => {
		it('should return a search tool that requests through the node request helper', async () => {
			const node = new ToolSearXng();
			const { ctx, httpRequest } = createContext();

			const supplyDataResult = await node.supplyData.call(
				ctx as unknown as ISupplyDataFunctions,
				0,
			);

			const tool = supplyDataResult.response as DynamicTool;
			expect(tool).toBeInstanceOf(DynamicTool);
			expect(tool.name).toBe('searxng-search');

			await tool.invoke('current events');

			expect(httpRequest).toHaveBeenCalledWith({
				method: 'POST',
				url: 'https://searx.example.com/search',
				qs: {
					q: 'current events',
					format: 'json',
					pageno: 1,
					safesearch: 0,
				},
				headers: { Accept: 'application/json' },
				json: true,
				timeout: 15_000,
			});
		});

		it('should apply configured options as query parameters', async () => {
			const node = new ToolSearXng();
			const { ctx, httpRequest } = createContext({
				options: { numResults: 1, pageNumber: 3, language: 'fr', safesearch: 2 },
			});

			const supplyDataResult = await node.supplyData.call(
				ctx as unknown as ISupplyDataFunctions,
				0,
			);
			const tool = supplyDataResult.response as DynamicTool;
			const response = await tool.invoke('test');

			expect(httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					qs: {
						q: 'test',
						format: 'json',
						pageno: 3,
						language: 'fr',
						safesearch: 2,
					},
				}),
			);
			// numResults slices client-side
			expect(response).toBe(
				JSON.stringify({
					title: 'First result',
					link: 'https://example.com/1',
					snippet: 'First snippet',
				}),
			);
		});

		it('should trim trailing slashes from the configured API URL', async () => {
			const node = new ToolSearXng();
			const { ctx, httpRequest } = createContext({ apiUrl: 'https://searx.example.com//' });

			const supplyDataResult = await node.supplyData.call(
				ctx as unknown as ISupplyDataFunctions,
				0,
			);
			await (supplyDataResult.response as DynamicTool).invoke('test');

			expect(httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({ url: 'https://searx.example.com/search' }),
			);
		});

		it('should map results to comma-joined JSON strings', async () => {
			const node = new ToolSearXng();
			const { ctx } = createContext();

			const supplyDataResult = await node.supplyData.call(
				ctx as unknown as ISupplyDataFunctions,
				0,
			);
			const response = await (supplyDataResult.response as DynamicTool).invoke('test');

			expect(response).toBe(
				[
					JSON.stringify({
						title: 'First result',
						link: 'https://example.com/1',
						snippet: 'First snippet',
					}),
					JSON.stringify({
						title: 'Second result',
						link: 'https://example.com/2',
						snippet: 'Second snippet',
					}),
				].join(','),
			);
		});

		it('should fall back to answers, infoboxes and suggestions', async () => {
			const node = new ToolSearXng();

			const cases: Array<{ httpResponse: unknown; expected: string }> = [
				{ httpResponse: { results: [], answers: ['42'] }, expected: '42' },
				{
					httpResponse: { results: [], answers: [], infoboxes: [{ content: '<b>info</b> box' }] },
					expected: 'info box',
				},
				{
					httpResponse: { results: [], answers: [], infoboxes: [], suggestions: ['a', 'b'] },
					expected: 'Suggestions: a, b',
				},
				{ httpResponse: {}, expected: 'No good results found.' },
			];

			for (const { httpResponse, expected } of cases) {
				const { ctx } = createContext({ httpResponse });
				const supplyDataResult = await node.supplyData.call(
					ctx as unknown as ISupplyDataFunctions,
					0,
				);
				const response = await (supplyDataResult.response as DynamicTool).invoke('test');
				expect(response).toBe(expected);
			}
		});
	});

	describe('execute', () => {
		it('should execute a search per input item and return results', async () => {
			const node = new ToolSearXng();
			const { ctx, httpRequest } = createContext({
				inputData: [{ json: { input: 'machine learning' } }, { json: { input: 'deep learning' } }],
			});

			const result = await node.execute.call(ctx);

			expect(httpRequest).toHaveBeenCalledTimes(2);
			expect(httpRequest).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({ qs: expect.objectContaining({ q: 'machine learning' }) }),
			);
			expect(httpRequest).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({ qs: expect.objectContaining({ q: 'deep learning' }) }),
			);

			const expectedResponse = [
				JSON.stringify({
					title: 'First result',
					link: 'https://example.com/1',
					snippet: 'First snippet',
				}),
				JSON.stringify({
					title: 'Second result',
					link: 'https://example.com/2',
					snippet: 'Second snippet',
				}),
			].join(',');

			expect(result).toEqual([
				[
					{ json: { response: expectedResponse }, pairedItem: { item: 0 } },
					{ json: { response: expectedResponse }, pairedItem: { item: 1 } },
				],
			]);
		});

		it('should throw when an input item has no query', async () => {
			const node = new ToolSearXng();
			const { ctx, httpRequest } = createContext({ inputData: [{ json: {} }] });

			await expect(node.execute.call(ctx)).rejects.toThrow('Input item is missing');
			expect(httpRequest).not.toHaveBeenCalled();
		});

		it('should read credentials and options per item', async () => {
			const node = new ToolSearXng();
			const { ctx } = createContext({ inputData: [{ json: { input: 'test query' } }] });

			await node.execute.call(ctx);

			expect(ctx.getCredentials).toHaveBeenCalledWith('searXngApi');
			expect(ctx.getNodeParameter).toHaveBeenCalledWith('options', 0);
		});
	});
});
