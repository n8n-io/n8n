import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	McpRegistryCredentialBinding,
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
			type: '@n8n/mcp-registry.notion',
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
			type: '@n8n/mcp-registry.notion',
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
			type: '@n8n/mcp-registry.notion',
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

function createRegisteredNode(
	endpointUrl: string,
	transport: 'httpStreamable' | 'sse' = 'httpStreamable',
	bindings: McpRegistryCredentialBinding[] = [
		{ credentialType: 'someServiceMcpOAuth2Api', selector: 'oAuth2' },
	],
	nodeTypeName = '@n8n/mcp-registry.notion',
): McpRegistryClientTool {
	const node = new McpRegistryClientTool();
	const connection = {
		nodeTypeName,
		endpointUrl,
		endpointHostname: new URL(endpointUrl).hostname,
		transport,
		credentialBindings: bindings,
	};
	node.setRegistryRuntime({
		resolveConnection: (requestedNodeTypeName, selector) => {
			if (requestedNodeTypeName !== nodeTypeName) return undefined;
			const binding =
				bindings.length === 1
					? bindings[0]
					: bindings.find((candidate) => candidate.selector === selector);
			return binding ? { connection, binding } : undefined;
		},
		prepareConnection: ({ credentialType }) => ({
			ok: true,
			value: {
				...connection,
				credentialType,
				headers: { authorization: 'Bearer test' },
				allowedDomains: connection.endpointHostname,
			},
		}),
	});
	return node;
}

describe('McpRegistryClientTool', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		new McpRegistryClientTool().setRegistryRuntime(undefined);
	});

	describe('loadOptions: getTools', () => {
		it('reads connection params and delegates to loadMcpToolOptions with mcpOAuth2Api auth', async () => {
			const ctx = createLoadOptionsCtx({
				serverTransport: 'httpStreamable',
				endpointUrl: 'https://mcp.example.com/mcp',
				'options.timeout': 30000,
			});
			loadMcpToolOptionsMock.mockResolvedValue([{ name: 'tool-a', value: 'tool-a' }]);

			const node = createRegisteredNode('https://mcp.example.com/mcp');
			const result = await node.methods.loadOptions.getTools.call(ctx);

			expect(loadMcpToolOptionsMock).toHaveBeenCalledWith(
				ctx,
				expect.objectContaining({
					authentication: 'someServiceMcpOAuth2Api',
					transport: 'httpStreamable',
					endpointUrl: 'https://mcp.example.com/mcp',
					timeout: 30000,
				}),
			);
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
			const node = createRegisteredNode('https://mcp.example.com/mcp');

			await expect(node.methods.loadOptions.getTools.call(ctx)).rejects.toThrow(
				'No MCP credential found',
			);
		});

		it('falls back to default timeout when not set', async () => {
			const ctx = createLoadOptionsCtx({
				serverTransport: 'sse',
				endpointUrl: 'https://mcp.example.com/sse',
			});
			loadMcpToolOptionsMock.mockResolvedValue([]);

			const node = createRegisteredNode('https://mcp.example.com/sse', 'sse');
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

			const node = createRegisteredNode('https://mcp.notion.com/mcp');
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
			expect(buildMcpToolkitMock).toHaveBeenCalledWith(
				ctx,
				0,
				expect.objectContaining(expectedConfig),
			);
			expect(result).toBe(expectedToolkit);
		});

		it('uses default toolFilter values when filter params are absent', async () => {
			const ctx = createSupplyDataCtx({
				serverTransport: 'httpStreamable',
				endpointUrl: 'https://mcp.notion.com/mcp',
				include: 'all',
			});
			buildMcpToolkitMock.mockResolvedValue({ response: {} } as never);

			const node = createRegisteredNode('https://mcp.notion.com/mcp');
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

			const node = createRegisteredNode('https://mcp.notion.com/mcp');
			await expect(node.supplyData.call(ctx, 0)).rejects.toThrow('No MCP credential found');
		});

		it('uses the credential type selected by the registry authentication option', async () => {
			const ctx = createSupplyDataCtx(
				{
					authentication: 'enterpriseOAuth2',
					serverTransport: 'httpStreamable',
					endpointUrl: 'https://api.githubcopilot.com/mcp/',
					include: 'all',
				},
				{
					type: '@n8n/mcp-registry.gitHub',
					credentials: {
						githubOAuth2Api: {},
						githubEnterpriseOAuth2Api: {},
					},
				},
			);
			buildMcpToolkitMock.mockResolvedValue({ response: {} } as never);
			const node = createRegisteredNode(
				'https://api.githubcopilot.com/mcp/',
				'httpStreamable',
				[
					{ credentialType: 'githubOAuth2Api', selector: 'oAuth2' },
					{ credentialType: 'githubEnterpriseOAuth2Api', selector: 'enterpriseOAuth2' },
				],
				'@n8n/mcp-registry.gitHub',
			);

			await node.supplyData.call(ctx, 0);

			expect(buildMcpToolkitMock).toHaveBeenCalledWith(
				ctx,
				0,
				expect.objectContaining({
					authentication: 'githubEnterpriseOAuth2Api',
					registryCredential: expect.objectContaining({
						credentialType: 'githubEnterpriseOAuth2Api',
					}),
				}),
			);
		});

		it('uses the registered connection instead of saved endpoint parameters', async () => {
			const ctx = createSupplyDataCtx(
				{
					serverTransport: 'httpStreamable',
					endpointUrl: 'https://attacker.example/mcp',
					include: 'all',
				},
				{
					type: '@n8n/mcp-registry.secureServer',
					credentials: { secureOAuth2Api: {} },
				},
			);
			const node = createRegisteredNode(
				'https://trusted.example/mcp',
				'httpStreamable',
				[{ credentialType: 'secureOAuth2Api', selector: 'oAuth2' }],
				'@n8n/mcp-registry.secureServer',
			);
			buildMcpToolkitMock.mockResolvedValue({ response: {} } as never);

			await node.supplyData.call(ctx, 0);

			expect(buildMcpToolkitMock).toHaveBeenCalledWith(
				ctx,
				0,
				expect.objectContaining({
					endpointUrl: 'https://trusted.example/mcp',
					transport: 'httpStreamable',
				}),
			);
		});
	});

	describe('execute', () => {
		it('passes a per-item resolveConfig callback to executeMcpTool', async () => {
			const ctx = createExecuteCtx(
				{
					serverTransport: 'httpStreamable',
					endpointUrl: 'https://mcp.notion.com/mcp',
					'options.timeout': 60000,
					include: 'all',
					includeTools: [],
					excludeTools: [],
				},
				{ typeVersion: 1.1 },
			);
			executeMcpToolMock.mockResolvedValue([[]]);

			const node = createRegisteredNode('https://mcp.notion.com/mcp');
			await node.execute.call(ctx);

			expect(executeMcpToolMock).toHaveBeenCalledWith(
				ctx,
				expect.any(Function),
				expect.objectContaining({ enableSessionCache: true }),
			);

			const resolve = executeMcpToolMock.mock.calls[0][1];
			expect(resolve(0)).toMatchObject({
				authentication: 'someServiceMcpOAuth2Api',
				transport: 'httpStreamable',
				endpointUrl: 'https://mcp.notion.com/mcp',
				timeout: 60000,
				toolFilter: { mode: 'all', includeTools: [], excludeTools: [] },
			});
		});

		it('does not enable the session cache for v1 nodes', async () => {
			const ctx = createExecuteCtx(
				{
					serverTransport: 'httpStreamable',
					endpointUrl: 'https://mcp.notion.com/mcp',
					'options.timeout': 60000,
					include: 'all',
					includeTools: [],
					excludeTools: [],
				},
				{ typeVersion: 1 },
			);
			executeMcpToolMock.mockResolvedValue([[]]);

			await new McpRegistryClientTool().execute.call(ctx);

			expect(executeMcpToolMock).toHaveBeenCalledWith(
				ctx,
				expect.any(Function),
				expect.objectContaining({ enableSessionCache: false }),
			);
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

			const node = createRegisteredNode('https://mcp.notion.com/mcp');

			await expect(node.execute.call(ctx)).rejects.toThrow('No MCP credential found');
		});
	});

	describe('prepareConnection', () => {
		it('reports not_registered when the registry runtime is missing', () => {
			new McpRegistryClientTool().setRegistryRuntime(undefined);

			expect(
				McpRegistryClientTool.prepareConnection({
					connection: {
						nodeTypeName: '@n8n/mcp-registry.notion',
						endpointUrl: 'https://mcp.notion.com/mcp',
						endpointHostname: 'mcp.notion.com',
						transport: 'httpStreamable',
						credentialBindings: [{ credentialType: 'someServiceMcpOAuth2Api', selector: 'oAuth2' }],
						isTemplated: false,
					},
					credentialType: 'someServiceMcpOAuth2Api',
					credentialData: { oauthTokenData: { access_token: 'token' } },
				}),
			).toEqual({
				ok: false,
				error: {
					code: 'not_registered',
					message: 'MCP registry connection is not registered',
				},
			});
		});
	});
});
