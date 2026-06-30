import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { StructuredToolkit } from 'n8n-core';
import {
	NodeConnectionTypes,
	NodeOperationError,
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type INode,
	type ISupplyDataFunctions,
} from 'n8n-workflow';

import { McpClientsManager } from './McpClientsManager';
import { buildMcpToolkit, executeMcpTool, loadMcpToolOptions } from './runtime';
import type { ResolvedMcpConfig, McpConnectionConfig } from './runtime';
import type { McpTool } from './types';
import * as utils from './utils';
import { buildMcpToolName } from '../McpClientTool/utils';

vi.mock('@modelcontextprotocol/sdk/client/sse.js');
vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js');
vi.mock('@modelcontextprotocol/sdk/client/index.js');
vi.mock('@n8n/ai-utilities', async () => {
	const actual = await vi.importActual('@n8n/ai-utilities');
	return {
		...(actual as Record<string, unknown>),
		proxyFetch: vi.fn(),
	};
});

const baseConfig: ResolvedMcpConfig = {
	authentication: 'none',
	transport: 'httpStreamable',
	endpointUrl: 'https://mcp.example.com/mcp',
	timeout: 60000,
	toolFilter: { mode: 'all', includeTools: [], excludeTools: [] },
};

const baseConnectionConfig: McpConnectionConfig = {
	authentication: 'none',
	transport: 'httpStreamable',
	endpointUrl: 'https://mcp.example.com/mcp',
	timeout: 60000,
};

const sampleTool = {
	name: 'search',
	description: 'Search the workspace',
	inputSchema: {
		type: 'object' as const,
		properties: { query: { type: 'string' } },
	},
};

function createSupplyDataCtx(overrides: Record<string, unknown> = {}) {
	return mock<ISupplyDataFunctions>({
		getNode: vi.fn(() => mock<INode>({ typeVersion: 1, name: 'MCP', type: 'mcp' })),
		logger: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
		addInputData: vi.fn(() => ({ index: 0 })),
		addOutputData: vi.fn(),
		...overrides,
	} as Partial<ISupplyDataFunctions>);
}

function createExecuteCtx(
	inputItems: Array<{ json: Record<string, unknown> }>,
	overrides: Record<string, unknown> = {},
) {
	return mock<IExecuteFunctions>({
		getNode: vi.fn(() => mock<INode>({ typeVersion: 1, name: 'MCP', type: 'mcp' })),
		logger: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
		getInputData: vi.fn(() => inputItems),
		...overrides,
	} as Partial<IExecuteFunctions>);
}

describe('runtime', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('buildMcpToolkit', () => {
		it('passes the execution cancel signal to connectMcpClient while connecting', async () => {
			const abort = new AbortController();
			const connectMcpClientForCredential = vi
				.spyOn(utils, 'connectMcpClientForCredential')
				.mockResolvedValue({ ok: true, result: mock<Client>() });
			vi.spyOn(utils, 'getAllTools').mockResolvedValue([sampleTool] as McpTool[]);

			const ctx = createSupplyDataCtx({
				getExecutionCancelSignal: vi.fn(() => abort.signal),
			});

			await buildMcpToolkit(ctx, 0, baseConfig);

			expect(connectMcpClientForCredential).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ signal: abort.signal }),
			);
		});

		it('passes undefined as signal when getExecutionCancelSignal returns no signal', async () => {
			const connectMcpClientForCredential = vi
				.spyOn(utils, 'connectMcpClientForCredential')
				.mockResolvedValue({ ok: true, result: mock<Client>() });
			vi.spyOn(utils, 'getAllTools').mockResolvedValue([sampleTool] as McpTool[]);

			const ctx = createSupplyDataCtx({
				getExecutionCancelSignal: vi.fn(() => undefined),
			});

			await buildMcpToolkit(ctx, 0, baseConfig);

			expect(connectMcpClientForCredential).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ signal: undefined }),
			);
		});

		it('surfaces a cancelled connection result without listing tools', async () => {
			const abortError = new Error('aborted');
			abortError.name = 'AbortError';
			vi.spyOn(Client.prototype, 'connect').mockRejectedValue(abortError);
			const listTools = vi.spyOn(Client.prototype, 'listTools');
			const abort = new AbortController();
			const ctx = createSupplyDataCtx({
				getExecutionCancelSignal: vi.fn(() => abort.signal),
			});

			await expect(buildMcpToolkit(ctx, 0, baseConfig)).rejects.toThrow('Execution was cancelled');

			expect(listTools).not.toHaveBeenCalled();
			expect(ctx.addOutputData).toHaveBeenCalledWith(
				NodeConnectionTypes.AiTool,
				0,
				expect.any(NodeOperationError),
			);
		});

		it('throws when execution is already cancelled', async () => {
			const abort = new AbortController();
			abort.abort();
			const ctx = createSupplyDataCtx({
				getExecutionCancelSignal: vi.fn(() => abort.signal),
			});

			await expect(buildMcpToolkit(ctx, 0, baseConfig)).rejects.toThrow('Execution was cancelled');
		});

		it('routes connection failures through addOutputData and surfaces a NodeOperationError', async () => {
			vi.spyOn(Client.prototype, 'connect').mockRejectedValue(new Error('boom'));
			const ctx = createSupplyDataCtx();

			await expect(buildMcpToolkit(ctx, 0, baseConfig)).rejects.toThrow(NodeOperationError);
			expect(ctx.addOutputData).toHaveBeenCalledWith(
				NodeConnectionTypes.AiTool,
				0,
				expect.any(NodeOperationError),
			);
		});

		it('throws "MCP Server returned no tools" when the server returns an empty list', async () => {
			vi.spyOn(Client.prototype, 'connect').mockResolvedValue();
			vi.spyOn(Client.prototype, 'listTools').mockResolvedValue({ tools: [] });
			const closeSpy = vi.spyOn(Client.prototype, 'close').mockResolvedValue();
			const ctx = createSupplyDataCtx();

			await expect(buildMcpToolkit(ctx, 0, baseConfig)).rejects.toThrow(
				'MCP Server returned no tools',
			);
			expect(closeSpy).toHaveBeenCalled();
		});

		it('returns a StructuredToolkit with prefixed tool names and a working closeFunction', async () => {
			vi.spyOn(Client.prototype, 'connect').mockResolvedValue();
			vi.spyOn(Client.prototype, 'listTools').mockResolvedValue({ tools: [sampleTool] });
			const closeSpy = vi.spyOn(Client.prototype, 'close').mockResolvedValue();
			const ctx = createSupplyDataCtx();

			const result = await buildMcpToolkit(ctx, 0, baseConfig);

			expect(result.response).toBeInstanceOf(StructuredToolkit);
			const tools = (result.response as StructuredToolkit).getTools();
			expect(tools).toHaveLength(1);
			expect(tools[0].name).toBe(buildMcpToolName('MCP', 'search'));

			await result.closeFunction?.();
			expect(closeSpy).toHaveBeenCalled();
		});

		it('applies the tool filter (selected mode)', async () => {
			vi.spyOn(Client.prototype, 'connect').mockResolvedValue();
			vi.spyOn(Client.prototype, 'listTools').mockResolvedValue({
				tools: [sampleTool, { ...sampleTool, name: 'fetch' }],
			});
			vi.spyOn(Client.prototype, 'close').mockResolvedValue();
			const ctx = createSupplyDataCtx();

			const result = await buildMcpToolkit(ctx, 0, {
				...baseConfig,
				toolFilter: { mode: 'selected', includeTools: ['search'], excludeTools: [] },
			});

			const tools = (result.response as StructuredToolkit).getTools();
			expect(tools).toHaveLength(1);
			expect(tools[0].name).toBe(buildMcpToolName('MCP', 'search'));
		});
	});

	describe('executeMcpTool', () => {
		it('throws when execution is already cancelled', async () => {
			const abort = new AbortController();
			abort.abort();
			const ctx = createExecuteCtx([{ json: { tool: 'whatever' } }], {
				getExecutionCancelSignal: vi.fn(() => abort.signal),
			});

			await expect(executeMcpTool(ctx, () => baseConfig)).rejects.toThrow(
				'Execution was cancelled',
			);
		});

		it('throws when item.json.tool is missing', async () => {
			vi.spyOn(Client.prototype, 'connect').mockResolvedValue();
			vi.spyOn(Client.prototype, 'listTools').mockResolvedValue({ tools: [sampleTool] });
			vi.spyOn(Client.prototype, 'close').mockResolvedValue();
			const ctx = createExecuteCtx([{ json: { query: 'foo' } }]);

			await expect(executeMcpTool(ctx, () => baseConfig)).rejects.toThrow('Tool name not found');
		});

		it('sanitizes arguments against the tool inputSchema when additionalProperties is false', async () => {
			vi.spyOn(Client.prototype, 'connect').mockResolvedValue();
			vi.spyOn(Client.prototype, 'listTools').mockResolvedValue({
				tools: [
					{
						name: 'search',
						description: '',
						inputSchema: {
							type: 'object' as const,
							properties: { query: { type: 'string' } },
							additionalProperties: false,
						},
					},
				],
			});
			const callTool = jest
				.spyOn(Client.prototype, 'callTool')
				.mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] });
			vi.spyOn(Client.prototype, 'close').mockResolvedValue();

			const ctx = createExecuteCtx([
				{
					json: {
						tool: buildMcpToolName('MCP', 'search'),
						query: 'hello',
						extra: 'should be dropped',
					},
				},
			]);

			await executeMcpTool(ctx, () => baseConfig);

			expect(callTool).toHaveBeenCalledWith(
				{ name: 'search', arguments: { query: 'hello' } },
				expect.anything(),
				expect.objectContaining({ timeout: baseConfig.timeout }),
			);
		});

		it('passes additional arguments through when additionalProperties is true', async () => {
			vi.spyOn(Client.prototype, 'connect').mockResolvedValue();
			vi.spyOn(Client.prototype, 'listTools').mockResolvedValue({
				tools: [
					{
						name: 'search',
						description: '',
						inputSchema: { type: 'object' as const, additionalProperties: true },
					},
				],
			});
			const callTool = jest
				.spyOn(Client.prototype, 'callTool')
				.mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] });
			vi.spyOn(Client.prototype, 'close').mockResolvedValue();

			const ctx = createExecuteCtx([
				{
					json: {
						tool: buildMcpToolName('MCP', 'search'),
						query: 'hello',
						extra: 'kept',
					},
				},
			]);

			await executeMcpTool(ctx, () => baseConfig);

			expect(callTool).toHaveBeenCalledWith(
				{ name: 'search', arguments: { query: 'hello', extra: 'kept' } },
				expect.anything(),
				expect.anything(),
			);
		});

		it('forwards the abort signal and timeout to client.callTool', async () => {
			vi.spyOn(Client.prototype, 'connect').mockResolvedValue();
			vi.spyOn(Client.prototype, 'listTools').mockResolvedValue({ tools: [sampleTool] });
			const callTool = vi.spyOn(Client.prototype, 'callTool').mockResolvedValue({ content: [] });
			vi.spyOn(Client.prototype, 'close').mockResolvedValue();

			const abort = new AbortController();
			const ctx = createExecuteCtx([{ json: { tool: buildMcpToolName('MCP', 'search') } }], {
				getExecutionCancelSignal: vi.fn(() => abort.signal),
			});

			await executeMcpTool(ctx, () => ({ ...baseConfig, timeout: 7777 }));

			expect(callTool).toHaveBeenCalledWith(
				expect.anything(),
				expect.anything(),
				expect.objectContaining({ timeout: 7777, signal: abort.signal }),
			);
		});

		it('includes structuredContent in the response only when it is a non-empty object', async () => {
			vi.spyOn(Client.prototype, 'connect').mockResolvedValue();
			vi.spyOn(Client.prototype, 'listTools').mockResolvedValue({ tools: [sampleTool] });
			vi.spyOn(Client.prototype, 'callTool').mockResolvedValue({
				content: [{ type: 'text', text: 'ok' }],
				structuredContent: { id: 'abc' },
			});
			vi.spyOn(Client.prototype, 'close').mockResolvedValue();

			const ctx = createExecuteCtx([{ json: { tool: buildMcpToolName('MCP', 'search') } }]);

			const result = await executeMcpTool(ctx, () => baseConfig);

			expect(result[0][0].json).toEqual({
				response: [{ type: 'text', text: 'ok' }],
				structuredContent: { id: 'abc' },
			});
		});

		it('omits structuredContent when it is null', async () => {
			vi.spyOn(Client.prototype, 'connect').mockResolvedValue();
			vi.spyOn(Client.prototype, 'listTools').mockResolvedValue({ tools: [sampleTool] });
			vi.spyOn(Client.prototype, 'callTool').mockResolvedValue({
				content: [{ type: 'text', text: 'ok' }],
				toolResult: undefined,
				structuredContent: null,
			});
			vi.spyOn(Client.prototype, 'close').mockResolvedValue();

			const ctx = createExecuteCtx([{ json: { tool: buildMcpToolName('MCP', 'search') } }]);

			const result = await executeMcpTool(ctx, () => baseConfig);

			expect(result[0][0].json).toEqual({
				response: [{ type: 'text', text: 'ok' }],
			});
		});

		it('closes the client even when the call throws', async () => {
			vi.spyOn(Client.prototype, 'connect').mockResolvedValue();
			vi.spyOn(Client.prototype, 'listTools').mockResolvedValue({ tools: [sampleTool] });
			vi.spyOn(Client.prototype, 'callTool').mockRejectedValue(new Error('network'));
			const closeSpy = vi.spyOn(Client.prototype, 'close').mockResolvedValue();

			const ctx = createExecuteCtx([{ json: { tool: buildMcpToolName('MCP', 'search') } }]);

			await expect(executeMcpTool(ctx, () => baseConfig)).rejects.toThrow('network');
			expect(closeSpy).toHaveBeenCalled();
		});

		// A tool result flagged `isError` must throw rather than be returned as node
		// output. Only a thrown error reaches the execution engine's node-failure
		// handling, which is what routes the error back to the calling agent.
		it('throws with the tool error text when the tool result is flagged isError (v1.3+)', async () => {
			vi.spyOn(Client.prototype, 'connect').mockResolvedValue();
			vi.spyOn(Client.prototype, 'listTools').mockResolvedValue({ tools: [sampleTool] });
			vi.spyOn(Client.prototype, 'callTool').mockResolvedValue({
				isError: true,
				content: [{ type: 'text', text: 'MCP error -32602: bad arguments' }],
			});

			const ctx = createExecuteCtx([{ json: { tool: buildMcpToolName('MCP', 'search') } }], {
				getNode: vi.fn(() => mock<INode>({ typeVersion: 1.3, name: 'MCP', type: 'mcp' })),
			});

			await expect(executeMcpTool(ctx, () => baseConfig)).rejects.toThrow(
				'MCP error -32602: bad arguments',
			);
		});

		// Throwing on isError only applies to typeVersion >= 1.3; older nodes
		// pass the flagged result through as normal output.
		it('returns the flagged result without throwing for nodes before v1.3', async () => {
			vi.spyOn(Client.prototype, 'connect').mockResolvedValue();
			vi.spyOn(Client.prototype, 'listTools').mockResolvedValue({ tools: [sampleTool] });
			vi.spyOn(Client.prototype, 'callTool').mockResolvedValue({
				isError: true,
				content: [{ type: 'text', text: 'some error' }],
			});
			vi.spyOn(Client.prototype, 'close').mockResolvedValue();

			const ctx = createExecuteCtx([{ json: { tool: buildMcpToolName('MCP', 'search') } }], {
				getNode: vi.fn(() => mock<INode>({ typeVersion: 1.2, name: 'MCP', type: 'mcp' })),
			});

			const result = await executeMcpTool(ctx, () => baseConfig);

			expect(result[0][0].json).toEqual({
				response: [{ type: 'text', text: 'some error' }],
			});
		});
	});

	describe('executeMcpTool session cache', () => {
		let manager: McpClientsManager;

		function createCachedCtx(executionId: string, overrides: Record<string, unknown> = {}) {
			return mock<IExecuteFunctions>({
				getNode: vi.fn(() => mock<INode>({ typeVersion: 1.4, name: 'MCP', type: 'mcp' })),
				logger: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
				getInputData: vi.fn(() => [{ json: { tool: buildMcpToolName('MCP', 'search') } }]),
				getExecutionId: vi.fn(() => executionId),
				getExecutionCancelSignal: vi.fn(() => undefined),
				onExecutionCancellation: vi.fn(),
				...overrides,
			} as Partial<IExecuteFunctions>);
		}

		beforeEach(() => {
			manager = new McpClientsManager({
				cacheTtl: 300_000,
				cacheMaxSize: 500,
			} as never);
			vi.mocked(Container.get).mockReturnValue(manager as never);
		});

		afterEach(() => {
			manager.shutdown();
		});

		it('reuses one client across execute calls within the same execution', async () => {
			const connect = vi.spyOn(Client.prototype, 'connect').mockResolvedValue();
			vi.spyOn(Client.prototype, 'listTools').mockResolvedValue({ tools: [sampleTool] });
			vi.spyOn(Client.prototype, 'callTool').mockResolvedValue({ content: [] });
			const close = vi.spyOn(Client.prototype, 'close').mockResolvedValue();

			const ctx = createCachedCtx('exec-1');
			await executeMcpTool(ctx, () => baseConfig, { enableSessionCache: true });
			await executeMcpTool(ctx, () => baseConfig, { enableSessionCache: true });

			expect(connect).toHaveBeenCalledTimes(1);
			expect(Client.prototype.callTool).toHaveBeenCalledTimes(2);
			expect(close).not.toHaveBeenCalled();
			expect(manager.size).toBe(1);
		});

		it('opens a fresh client per call when the cache is disabled', async () => {
			const connect = vi.spyOn(Client.prototype, 'connect').mockResolvedValue();
			vi.spyOn(Client.prototype, 'listTools').mockResolvedValue({ tools: [sampleTool] });
			vi.spyOn(Client.prototype, 'callTool').mockResolvedValue({ content: [] });
			const close = vi.spyOn(Client.prototype, 'close').mockResolvedValue();

			const ctx = createCachedCtx('exec-1');
			await executeMcpTool(ctx, () => baseConfig);
			await executeMcpTool(ctx, () => baseConfig);

			expect(connect).toHaveBeenCalledTimes(2);
			expect(close).toHaveBeenCalledTimes(2);
		});

		it('bypasses the cache when there is no execution id', async () => {
			const connect = vi.spyOn(Client.prototype, 'connect').mockResolvedValue();
			vi.spyOn(Client.prototype, 'listTools').mockResolvedValue({ tools: [sampleTool] });
			vi.spyOn(Client.prototype, 'callTool').mockResolvedValue({ content: [] });
			const close = vi.spyOn(Client.prototype, 'close').mockResolvedValue();

			const ctx = createCachedCtx('');
			await executeMcpTool(ctx, () => baseConfig, { enableSessionCache: true });
			await executeMcpTool(ctx, () => baseConfig, { enableSessionCache: true });

			expect(connect).toHaveBeenCalledTimes(2);
			expect(close).toHaveBeenCalledTimes(2);
			expect(manager.size).toBe(0);
		});

		it('does not share the cache across different executions', async () => {
			vi.spyOn(Client.prototype, 'connect').mockResolvedValue();
			vi.spyOn(Client.prototype, 'listTools').mockResolvedValue({ tools: [sampleTool] });
			vi.spyOn(Client.prototype, 'callTool').mockResolvedValue({ content: [] });
			vi.spyOn(Client.prototype, 'close').mockResolvedValue();

			await executeMcpTool(createCachedCtx('exec-1'), () => baseConfig, {
				enableSessionCache: true,
			});
			await executeMcpTool(createCachedCtx('exec-2'), () => baseConfig, {
				enableSessionCache: true,
			});

			expect(Client.prototype.connect).toHaveBeenCalledTimes(2);
			expect(manager.size).toBe(2);
		});

		it('closes and evicts the cached client on execution cancellation', async () => {
			vi.spyOn(Client.prototype, 'connect').mockResolvedValue();
			vi.spyOn(Client.prototype, 'listTools').mockResolvedValue({ tools: [sampleTool] });
			vi.spyOn(Client.prototype, 'callTool').mockResolvedValue({ content: [] });
			const close = vi.spyOn(Client.prototype, 'close').mockResolvedValue();

			let cancel: () => void = () => {};
			const ctx = createCachedCtx('exec-1', {
				onExecutionCancellation: vi.fn((handler: () => void) => {
					cancel = handler;
				}),
			});

			await executeMcpTool(ctx, () => baseConfig, { enableSessionCache: true });
			expect(manager.size).toBe(1);

			cancel();
			expect(close).toHaveBeenCalledTimes(1);
			expect(manager.size).toBe(0);
		});
	});

	describe('loadMcpToolOptions', () => {
		it('returns INodePropertyOptions mapped from listTools', async () => {
			vi.spyOn(Client.prototype, 'connect').mockResolvedValue();
			vi.spyOn(Client.prototype, 'listTools').mockResolvedValue({ tools: [sampleTool] });
			vi.spyOn(Client.prototype, 'close').mockResolvedValue();
			const ctx = mock<ILoadOptionsFunctions>({
				getNode: vi.fn(() => mock<INode>({ typeVersion: 1, name: 'MCP' })),
			});

			const result = await loadMcpToolOptions(ctx, baseConnectionConfig);

			expect(result).toEqual([
				{
					name: sampleTool.name,
					value: sampleTool.name,
					description: sampleTool.description,
					inputSchema: sampleTool.inputSchema,
				},
			]);
		});

		it('throws NodeOperationError when connect fails', async () => {
			vi.spyOn(Client.prototype, 'connect').mockRejectedValue(new Error('boom'));
			const ctx = mock<ILoadOptionsFunctions>({
				getNode: vi.fn(() => mock<INode>({ typeVersion: 1, name: 'MCP' })),
			});

			await expect(loadMcpToolOptions(ctx, baseConnectionConfig)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('closes the client even when listing fails', async () => {
			vi.spyOn(Client.prototype, 'connect').mockResolvedValue();
			vi.spyOn(Client.prototype, 'listTools').mockRejectedValue(new Error('list-failed'));
			const closeSpy = vi.spyOn(Client.prototype, 'close').mockResolvedValue();
			const ctx = mock<ILoadOptionsFunctions>({
				getNode: vi.fn(() => mock<INode>({ typeVersion: 1, name: 'MCP' })),
			});

			await expect(loadMcpToolOptions(ctx, baseConnectionConfig)).rejects.toThrow('list-failed');
			expect(closeSpy).toHaveBeenCalled();
		});
	});
});
