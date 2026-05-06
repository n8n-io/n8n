import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INode,
	ISupplyDataFunctions,
} from 'n8n-workflow';
import type { MockedFunction } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import {
	buildMcpToolkit,
	executeMcpTool,
	loadMcpToolOptions,
	type ResolvedMcpConfig,
} from '../shared/runtime';
import { McpRegistryClientTool } from './McpRegistryClientTool.node';

vi.mock('../shared/runtime', () => ({
	buildMcpToolkit: vi.fn(),
	executeMcpTool: vi.fn(),
	loadMcpToolOptions: vi.fn(),
}));

const buildMcpToolkitMock = buildMcpToolkit as MockedFunction<typeof buildMcpToolkit>;
const executeMcpToolMock = executeMcpTool as MockedFunction<typeof executeMcpTool>;
const loadMcpToolOptionsMock = loadMcpToolOptions as MockedFunction<typeof loadMcpToolOptions>;

type ParamMap = Record<string, unknown>;

function createLoadOptionsCtx(params: ParamMap) {
	const ctx = mockDeep<ILoadOptionsFunctions>();
	ctx.getNode.mockReturnValue(mock<INode>({ name: 'Notion MCP', type: 'notion' }));
	ctx.getNodeParameter.mockImplementation((key: string, defaultValue?: unknown) => {
		return (key in params ? params[key] : defaultValue) as never;
	});
	return ctx;
}

function createSupplyDataCtx(params: ParamMap) {
	const ctx = mockDeep<ISupplyDataFunctions>();
	ctx.getNode.mockReturnValue(mock<INode>({ name: 'Notion MCP', type: 'notion' }));
	ctx.getNodeParameter.mockImplementation(
		(key: string, _itemIndex?: number, defaultValue?: unknown) => {
			return (key in params ? params[key] : defaultValue) as never;
		},
	);
	return ctx;
}

function createExecuteCtx(params: ParamMap) {
	const ctx = mockDeep<IExecuteFunctions>();
	ctx.getNode.mockReturnValue(mock<INode>({ name: 'Notion MCP', type: 'notion' }));
	ctx.getNodeParameter.mockImplementation(
		(key: string, _itemIndex: number, defaultValue?: unknown) => {
			return (key in params ? params[key] : defaultValue) as never;
		},
	);
	return ctx;
}

describe('McpRegistryClientTool', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('loadOptions: getTools', () => {
		it('reads connection params and delegates to loadMcpToolOptions with mcpOAuth2Api auth', async () => {
			const ctx = createLoadOptionsCtx({
				serverTransport: 'httpStreamable',
				endpointUrl: 'https://mcp.example.com/mcp',
				'options.timeout': 30000,
			});
			loadMcpToolOptionsMock.mockResolvedValue([{ name: 'tool-a', value: 'tool-a' }]);

			const node = new McpRegistryClientTool();
			const result = await node.methods.loadOptions.getTools.call(ctx);

			expect(loadMcpToolOptionsMock).toHaveBeenCalledWith(ctx, {
				authentication: 'mcpOAuth2Api',
				transport: 'httpStreamable',
				endpointUrl: 'https://mcp.example.com/mcp',
				timeout: 30000,
			});
			expect(result).toEqual([{ name: 'tool-a', value: 'tool-a' }]);
		});

		it('falls back to default timeout when not set', async () => {
			const ctx = createLoadOptionsCtx({
				serverTransport: 'sse',
				endpointUrl: 'https://mcp.example.com/sse',
			});
			loadMcpToolOptionsMock.mockResolvedValue([]);

			const node = new McpRegistryClientTool();
			await node.methods.loadOptions.getTools.call(ctx);

			expect(loadMcpToolOptionsMock).toHaveBeenCalledWith(
				ctx,
				expect.objectContaining({ timeout: 60000 }),
			);
		});
	});

	describe('supplyData', () => {
		it('builds a ResolvedMcpConfig from params and delegates to buildMcpToolkit', async () => {
			const ctx = createSupplyDataCtx({
				serverTransport: 'httpStreamable',
				endpointUrl: 'https://mcp.notion.com/mcp',
				'options.timeout': 12345,
				include: 'selected',
				includeTools: ['notion-search'],
				excludeTools: [],
			});
			const expectedToolkit = { response: {}, closeFunction: vi.fn() };
			buildMcpToolkitMock.mockResolvedValue(expectedToolkit as never);

			const node = new McpRegistryClientTool();
			const result = await node.supplyData.call(ctx, 0);

			const expectedConfig: ResolvedMcpConfig = {
				authentication: 'mcpOAuth2Api',
				transport: 'httpStreamable',
				endpointUrl: 'https://mcp.notion.com/mcp',
				timeout: 12345,
				toolFilter: {
					mode: 'selected',
					includeTools: ['notion-search'],
					excludeTools: [],
				},
			};
			expect(buildMcpToolkitMock).toHaveBeenCalledWith(ctx, 0, expectedConfig);
			expect(result).toBe(expectedToolkit);
		});

		it('uses default toolFilter values when filter params are absent', async () => {
			const ctx = createSupplyDataCtx({
				serverTransport: 'httpStreamable',
				endpointUrl: 'https://mcp.notion.com/mcp',
				include: 'all',
			});
			buildMcpToolkitMock.mockResolvedValue({ response: {} } as never);

			const node = new McpRegistryClientTool();
			await node.supplyData.call(ctx, 0);

			expect(buildMcpToolkitMock).toHaveBeenCalledWith(
				ctx,
				0,
				expect.objectContaining({
					timeout: 60000,
					toolFilter: { mode: 'all', includeTools: [], excludeTools: [] },
				}),
			);
		});
	});

	describe('execute', () => {
		it('passes a per-item resolveConfig callback to executeMcpTool', async () => {
			const ctx = createExecuteCtx({
				serverTransport: 'httpStreamable',
				endpointUrl: 'https://mcp.notion.com/mcp',
				'options.timeout': 60000,
				include: 'all',
				includeTools: [],
				excludeTools: [],
			});
			executeMcpToolMock.mockResolvedValue([[]]);

			const node = new McpRegistryClientTool();
			await node.execute.call(ctx);

			expect(executeMcpToolMock).toHaveBeenCalledWith(ctx, expect.any(Function));

			const resolve = executeMcpToolMock.mock.calls[0][1];
			expect(resolve(0)).toEqual({
				authentication: 'mcpOAuth2Api',
				transport: 'httpStreamable',
				endpointUrl: 'https://mcp.notion.com/mcp',
				timeout: 60000,
				toolFilter: { mode: 'all', includeTools: [], excludeTools: [] },
			});
		});
	});
});
