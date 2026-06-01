import { Client } from '@modelcontextprotocol/sdk/client/index.js';
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

import { buildMcpToolkit, executeMcpTool, loadMcpToolOptions } from './runtime';
import type { ResolvedMcpConfig, McpConnectionConfig } from './runtime';
import { buildMcpToolName } from '../McpClientTool/utils';

jest.mock('@modelcontextprotocol/sdk/client/sse.js');
jest.mock('@modelcontextprotocol/sdk/client/streamableHttp.js');
jest.mock('@modelcontextprotocol/sdk/client/index.js');
jest.mock('@n8n/ai-utilities', () => ({
	...jest.requireActual('@n8n/ai-utilities'),
	proxyFetch: jest.fn(),
}));

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
		getNode: jest.fn(() => mock<INode>({ typeVersion: 1, name: 'MCP', type: 'mcp' })),
		logger: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
		addInputData: jest.fn(() => ({ index: 0 })),
		addOutputData: jest.fn(),
		...overrides,
	} as Partial<ISupplyDataFunctions>);
}

function createExecuteCtx(
	inputItems: Array<{ json: Record<string, unknown> }>,
	overrides: Record<string, unknown> = {},
) {
	return mock<IExecuteFunctions>({
		getNode: jest.fn(() => mock<INode>({ typeVersion: 1, name: 'MCP', type: 'mcp' })),
		logger: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
		getInputData: jest.fn(() => inputItems),
		...overrides,
	} as Partial<IExecuteFunctions>);
}

describe('runtime', () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('buildMcpToolkit', () => {
		it('throws when execution is already cancelled', async () => {
			const abort = new AbortController();
			abort.abort();
			const ctx = createSupplyDataCtx({
				getExecutionCancelSignal: jest.fn(() => abort.signal),
			});

			await expect(buildMcpToolkit(ctx, 0, baseConfig)).rejects.toThrow('Execution was cancelled');
		});

		it('routes connection failures through addOutputData and surfaces a NodeOperationError', async () => {
			jest.spyOn(Client.prototype, 'connect').mockRejectedValue(new Error('boom'));
			const ctx = createSupplyDataCtx();

			await expect(buildMcpToolkit(ctx, 0, baseConfig)).rejects.toThrow(NodeOperationError);
			expect(ctx.addOutputData).toHaveBeenCalledWith(
				NodeConnectionTypes.AiTool,
				0,
				expect.any(NodeOperationError),
			);
		});

		it('throws "MCP Server returned no tools" when the server returns an empty list', async () => {
			jest.spyOn(Client.prototype, 'connect').mockResolvedValue();
			jest.spyOn(Client.prototype, 'listTools').mockResolvedValue({ tools: [] });
			const closeSpy = jest.spyOn(Client.prototype, 'close').mockResolvedValue();
			const ctx = createSupplyDataCtx();

			await expect(buildMcpToolkit(ctx, 0, baseConfig)).rejects.toThrow(
				'MCP Server returned no tools',
			);
			expect(closeSpy).toHaveBeenCalled();
		});

		it('returns a StructuredToolkit with prefixed tool names and a working closeFunction', async () => {
			jest.spyOn(Client.prototype, 'connect').mockResolvedValue();
			jest.spyOn(Client.prototype, 'listTools').mockResolvedValue({ tools: [sampleTool] });
			const closeSpy = jest.spyOn(Client.prototype, 'close').mockResolvedValue();
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
			jest.spyOn(Client.prototype, 'connect').mockResolvedValue();
			jest.spyOn(Client.prototype, 'listTools').mockResolvedValue({
				tools: [sampleTool, { ...sampleTool, name: 'fetch' }],
			});
			jest.spyOn(Client.prototype, 'close').mockResolvedValue();
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
				getExecutionCancelSignal: jest.fn(() => abort.signal),
			});

			await expect(executeMcpTool(ctx, () => baseConfig)).rejects.toThrow(
				'Execution was cancelled',
			);
		});

		it('throws when item.json.tool is missing', async () => {
			jest.spyOn(Client.prototype, 'connect').mockResolvedValue();
			jest.spyOn(Client.prototype, 'listTools').mockResolvedValue({ tools: [sampleTool] });
			jest.spyOn(Client.prototype, 'close').mockResolvedValue();
			const ctx = createExecuteCtx([{ json: { query: 'foo' } }]);

			await expect(executeMcpTool(ctx, () => baseConfig)).rejects.toThrow('Tool name not found');
		});

		it('sanitizes arguments against the tool inputSchema when additionalProperties is false', async () => {
			jest.spyOn(Client.prototype, 'connect').mockResolvedValue();
			jest.spyOn(Client.prototype, 'listTools').mockResolvedValue({
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
			jest.spyOn(Client.prototype, 'close').mockResolvedValue();

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
			jest.spyOn(Client.prototype, 'connect').mockResolvedValue();
			jest.spyOn(Client.prototype, 'listTools').mockResolvedValue({
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
			jest.spyOn(Client.prototype, 'close').mockResolvedValue();

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
			jest.spyOn(Client.prototype, 'connect').mockResolvedValue();
			jest.spyOn(Client.prototype, 'listTools').mockResolvedValue({ tools: [sampleTool] });
			const callTool = jest.spyOn(Client.prototype, 'callTool').mockResolvedValue({ content: [] });
			jest.spyOn(Client.prototype, 'close').mockResolvedValue();

			const abort = new AbortController();
			const ctx = createExecuteCtx([{ json: { tool: buildMcpToolName('MCP', 'search') } }], {
				getExecutionCancelSignal: jest.fn(() => abort.signal),
			});

			await executeMcpTool(ctx, () => ({ ...baseConfig, timeout: 7777 }));

			expect(callTool).toHaveBeenCalledWith(
				expect.anything(),
				expect.anything(),
				expect.objectContaining({ timeout: 7777, signal: abort.signal }),
			);
		});

		it('includes structuredContent in the response only when it is a non-empty object', async () => {
			jest.spyOn(Client.prototype, 'connect').mockResolvedValue();
			jest.spyOn(Client.prototype, 'listTools').mockResolvedValue({ tools: [sampleTool] });
			jest.spyOn(Client.prototype, 'callTool').mockResolvedValue({
				content: [{ type: 'text', text: 'ok' }],
				structuredContent: { id: 'abc' },
			});
			jest.spyOn(Client.prototype, 'close').mockResolvedValue();

			const ctx = createExecuteCtx([{ json: { tool: buildMcpToolName('MCP', 'search') } }]);

			const result = await executeMcpTool(ctx, () => baseConfig);

			expect(result[0][0].json).toEqual({
				response: [{ type: 'text', text: 'ok' }],
				structuredContent: { id: 'abc' },
			});
		});

		it('omits structuredContent when it is null', async () => {
			jest.spyOn(Client.prototype, 'connect').mockResolvedValue();
			jest.spyOn(Client.prototype, 'listTools').mockResolvedValue({ tools: [sampleTool] });
			jest.spyOn(Client.prototype, 'callTool').mockResolvedValue({
				content: [{ type: 'text', text: 'ok' }],
				toolResult: undefined,
				structuredContent: null,
			});
			jest.spyOn(Client.prototype, 'close').mockResolvedValue();

			const ctx = createExecuteCtx([{ json: { tool: buildMcpToolName('MCP', 'search') } }]);

			const result = await executeMcpTool(ctx, () => baseConfig);

			expect(result[0][0].json).toEqual({
				response: [{ type: 'text', text: 'ok' }],
			});
		});

		it('closes the client even when the call throws', async () => {
			jest.spyOn(Client.prototype, 'connect').mockResolvedValue();
			jest.spyOn(Client.prototype, 'listTools').mockResolvedValue({ tools: [sampleTool] });
			jest.spyOn(Client.prototype, 'callTool').mockRejectedValue(new Error('network'));
			const closeSpy = jest.spyOn(Client.prototype, 'close').mockResolvedValue();

			const ctx = createExecuteCtx([{ json: { tool: buildMcpToolName('MCP', 'search') } }]);

			await expect(executeMcpTool(ctx, () => baseConfig)).rejects.toThrow('network');
			expect(closeSpy).toHaveBeenCalled();
		});
	});

	describe('loadMcpToolOptions', () => {
		it('returns INodePropertyOptions mapped from listTools', async () => {
			jest.spyOn(Client.prototype, 'connect').mockResolvedValue();
			jest.spyOn(Client.prototype, 'listTools').mockResolvedValue({ tools: [sampleTool] });
			jest.spyOn(Client.prototype, 'close').mockResolvedValue();
			const ctx = mock<ILoadOptionsFunctions>({
				getNode: jest.fn(() => mock<INode>({ typeVersion: 1, name: 'MCP' })),
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
			jest.spyOn(Client.prototype, 'connect').mockRejectedValue(new Error('boom'));
			const ctx = mock<ILoadOptionsFunctions>({
				getNode: jest.fn(() => mock<INode>({ typeVersion: 1, name: 'MCP' })),
			});

			await expect(loadMcpToolOptions(ctx, baseConnectionConfig)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('closes the client even when listing fails', async () => {
			jest.spyOn(Client.prototype, 'connect').mockResolvedValue();
			jest.spyOn(Client.prototype, 'listTools').mockRejectedValue(new Error('list-failed'));
			const closeSpy = jest.spyOn(Client.prototype, 'close').mockResolvedValue();
			const ctx = mock<ILoadOptionsFunctions>({
				getNode: jest.fn(() => mock<INode>({ typeVersion: 1, name: 'MCP' })),
			});

			await expect(loadMcpToolOptions(ctx, baseConnectionConfig)).rejects.toThrow('list-failed');
			expect(closeSpy).toHaveBeenCalled();
		});
	});
});
