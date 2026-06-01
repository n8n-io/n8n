import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INode,
	ISupplyDataFunctions,
} from 'n8n-workflow';
import type { MockedFunction } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import { McpRegistryClientTool } from './McpRegistryClientTool.node';
import {
	buildMcpToolkit,
	executeMcpTool,
	loadMcpToolOptions,
	type ResolvedMcpConfig,
} from '../shared/runtime';

vi.mock('../shared/runtime', () => ({
	buildMcpToolkit: vi.fn(),
	executeMcpTool: vi.fn(),
	loadMcpToolOptions: vi.fn(),
}));

const buildMcpToolkitMock = buildMcpToolkit as MockedFunction<typeof buildMcpToolkit>;
const executeMcpToolMock = executeMcpTool as MockedFunction<typeof executeMcpTool>;
const loadMcpToolOptionsMock = loadMcpToolOptions as MockedFunction<typeof loadMcpToolOptions>;

type ParamMap = Record<string, unknown>;

function createLoadOptionsCtx(params: ParamMap, nodeOverrides?: ParamMap) {
	const ctx = mockDeep<ILoadOptionsFunctions>();
	ctx.getNode.mockReturnValue(
		mock<INode>({
			name: 'Notion MCP',
			type: 'notion',
			credentials: { someServiceMcpOAuth2Api: {} },
			...(nodeOverrides ?? {}),
		}),
	);
	ctx.getNodeParameter.mockImplementation((key: string, defaultValue?: unknown) => {
		return (key in params ? params[key] : defaultValue) as never;
	});
	return ctx;
}

function createSupplyDataCtx(params: ParamMap, nodeOverrides?: ParamMap) {
	const ctx = mockDeep<ISupplyDataFunctions>();
	ctx.getNode.mockReturnValue(
		mock<INode>({
			name: 'Notion MCP',
			type: 'notion',
			credentials: { someServiceMcpOAuth2Api: {} },
			...(nodeOverrides ?? {}),
		}),
	);
	ctx.getNodeParameter.mockImplementation(
		(key: string, _itemIndex?: number, defaultValue?: unknown) => {
			return (key in params ? params[key] : defaultValue) as never;
		},
	);
	return ctx;
}

function createExecuteCtx(params: ParamMap, nodeOverrides?: ParamMap) {
	const ctx = mockDeep<IExecuteFunctions>();
	ctx.getNode.mockReturnValue(
		mock<INode>({
			name: 'Notion MCP',
			type: 'notion',
			credentials: { someServiceMcpOAuth2Api: {} },
			...(nodeOverrides ?? {}),
		}),
	);
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
				authentication: 'someServiceMcpOAuth2Api',
				transport: 'httpStreamable',
				endpointUrl: 'https://mcp.example.com/mcp',
				timeout: 30000,
			});
			expect(result).toEqual([{ name: 'tool-a', value: 'tool-a' }]);
		});

		it('throws an error when no OAuth2 credentials are defined on the node', async () => {
			const ctx = createLoadOptionsCtx(
				{
					serverTransport: 'httpStreamable',
					endpointUrl: 'https://mcp.example.com/mcp',
					'options.timeout': 30000,
				},
				{
					credentials: {},
				},
			);
			loadMcpToolOptionsMock.mockResolvedValue([{ name: 'tool-a', value: 'tool-a' }]);
			const node = new McpRegistryClientTool();

			await expect(node.methods.loadOptions.getTools.call(ctx)).rejects.toThrow(
				'No MCP OAuth2 credential type found',
			);
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
				authentication: 'someServiceMcpOAuth2Api',
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

		it('throws an error when no OAuth2 credentials are defined on the node', async () => {
			const ctx = createSupplyDataCtx(
				{
					serverTransport: 'httpStreamable',
					endpointUrl: 'https://mcp.notion.com/mcp',
					'options.timeout': 30000,
				},
				{
					credentials: {},
				},
			);
			buildMcpToolkitMock.mockResolvedValue({ response: {} } as never);

			const node = new McpRegistryClientTool();
			await expect(node.supplyData.call(ctx, 0)).rejects.toThrow(
				'No MCP OAuth2 credential type found',
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
				authentication: 'someServiceMcpOAuth2Api',
				transport: 'httpStreamable',
				endpointUrl: 'https://mcp.notion.com/mcp',
				timeout: 60000,
				toolFilter: { mode: 'all', includeTools: [], excludeTools: [] },
			});
		});

		it('throws an error when no OAuth2 credentials are defined on the node', async () => {
			const ctx = createExecuteCtx(
				{
					serverTransport: 'httpStreamable',
					endpointUrl: 'https://mcp.notion.com/mcp',
					'options.timeout': 30000,
				},
				{
					credentials: {},
				},
			);
			executeMcpToolMock.mockImplementation(async (_ctx, resolveConfig) => {
				await resolveConfig(0);
				return [[]];
			});

			const node = new McpRegistryClientTool();

			await expect(node.execute.call(ctx)).rejects.toThrow('No MCP OAuth2 credential type found');
		});
	});
});
