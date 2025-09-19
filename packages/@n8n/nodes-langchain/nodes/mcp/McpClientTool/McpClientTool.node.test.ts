import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { mock } from 'jest-mock-extended';
import {
	NodeConnectionTypes,
	NodeOperationError,
	type ILoadOptionsFunctions,
	type INode,
	type ISupplyDataFunctions,
} from 'n8n-workflow';

import { getTools } from './loadOptions';
import { McpClientTool } from './McpClientTool.node';
import { McpToolkit } from './utils';

jest.mock('@modelcontextprotocol/sdk/client/sse.js');
jest.mock('@modelcontextprotocol/sdk/client/index.js');

describe('McpClientTool', () => {
	describe('loadOptions: getTools', () => {
		it('should return a list of tools', async () => {
			jest.spyOn(Client.prototype, 'connect').mockResolvedValue();
			jest.spyOn(Client.prototype, 'listTools').mockResolvedValue({
				tools: [
					{
						name: 'MyTool',
						description: 'MyTool does something',
						inputSchema: { type: 'object', properties: { input: { type: 'string' } } },
					},
				],
			});

			const result = await getTools.call(
				mock<ILoadOptionsFunctions>({ getNode: jest.fn(() => mock<INode>({ typeVersion: 1 })) }),
			);

			expect(result).toEqual([
				{
					description: 'MyTool does something',
					name: 'MyTool',
					value: 'MyTool',
					inputSchema: { type: 'object', properties: { input: { type: 'string' } } },
				},
			]);
		});

		it('should handle errors', async () => {
			jest.spyOn(Client.prototype, 'connect').mockRejectedValue(new Error('Fail!'));

			const node = mock<INode>({ typeVersion: 1 });
			await expect(
				getTools.call(mock<ILoadOptionsFunctions>({ getNode: jest.fn(() => node) })),
			).rejects.toEqual(new NodeOperationError(node, 'Could not connect to your MCP server'));
		});
	});

	describe('supplyData', () => {
		beforeEach(() => {
			jest.resetAllMocks();
		});

		it('should return a valid toolkit with usable tools (that returns a string)', async () => {
			jest.spyOn(Client.prototype, 'connect').mockResolvedValue();
			jest
				.spyOn(Client.prototype, 'callTool')
				.mockResolvedValue({ content: [{ type: 'text', text: 'result from tool' }] });
			jest.spyOn(Client.prototype, 'listTools').mockResolvedValue({
				tools: [
					{
						name: 'MyTool1',
						description: 'MyTool1 does something',
						inputSchema: { type: 'object', properties: { input: { type: 'string' } } },
					},
					{
						name: 'MyTool2',
						description: 'MyTool2 does something',
						inputSchema: { type: 'object', properties: { input2: { type: 'string' } } },
					},
				],
			});

			const supplyDataResult = await new McpClientTool().supplyData.call(
				mock<ISupplyDataFunctions>({
					getNode: jest.fn(() => mock<INode>({ typeVersion: 1 })),
					logger: { debug: jest.fn(), error: jest.fn() },
					addInputData: jest.fn(() => ({ index: 0 })),
				}),
				0,
			);

			expect(supplyDataResult.closeFunction).toBeInstanceOf(Function);
			expect(supplyDataResult.response).toBeInstanceOf(McpToolkit);

			const tools = (supplyDataResult.response as McpToolkit).getTools();
			expect(tools).toHaveLength(2);

			const toolCallResult = await tools[0].invoke({ input: 'foo' });
			expect(toolCallResult).toEqual(JSON.stringify([{ type: 'text', text: 'result from tool' }]));
		});

		it('should support selecting tools to expose', async () => {
			jest.spyOn(Client.prototype, 'connect').mockResolvedValue();
			jest.spyOn(Client.prototype, 'listTools').mockResolvedValue({
				tools: [
					{
						name: 'MyTool1',
						description: 'MyTool1 does something',
						inputSchema: { type: 'object', properties: { input: { type: 'string' } } },
					},
					{
						name: 'MyTool2',
						description: 'MyTool2 does something',
						inputSchema: { type: 'object', properties: { input2: { type: 'string' } } },
					},
				],
			});

			const supplyDataResult = await new McpClientTool().supplyData.call(
				mock<ISupplyDataFunctions>({
					getNode: jest.fn(() =>
						mock<INode>({
							typeVersion: 1,
						}),
					),
					getNodeParameter: jest.fn((key, _index) => {
						const parameters: Record<string, any> = {
							include: 'selected',
							includeTools: ['MyTool2'],
						};
						return parameters[key];
					}),
					logger: { debug: jest.fn(), error: jest.fn() },
					addInputData: jest.fn(() => ({ index: 0 })),
				}),
				0,
			);

			expect(supplyDataResult.closeFunction).toBeInstanceOf(Function);
			expect(supplyDataResult.response).toBeInstanceOf(McpToolkit);

			const tools = (supplyDataResult.response as McpToolkit).getTools();
			expect(tools).toHaveLength(1);
			expect(tools[0].name).toBe('MyTool2');
		});

		it('should support selecting tools to exclude', async () => {
			jest.spyOn(Client.prototype, 'connect').mockResolvedValue();
			jest.spyOn(Client.prototype, 'listTools').mockResolvedValue({
				tools: [
					{
						name: 'MyTool1',
						description: 'MyTool1 does something',
						inputSchema: { type: 'object', properties: { input: { type: 'string' } } },
					},
					{
						name: 'MyTool2',
						description: 'MyTool2 does something',
						inputSchema: { type: 'object', properties: { input2: { type: 'string' } } },
					},
				],
			});

			const supplyDataResult = await new McpClientTool().supplyData.call(
				mock<ISupplyDataFunctions>({
					getNode: jest.fn(() =>
						mock<INode>({
							typeVersion: 1,
						}),
					),
					getNodeParameter: jest.fn((key, _index) => {
						const parameters: Record<string, any> = {
							include: 'except',
							excludeTools: ['MyTool2'],
						};
						return parameters[key];
					}),
					logger: { debug: jest.fn(), error: jest.fn() },
					addInputData: jest.fn(() => ({ index: 0 })),
				}),
				0,
			);

			expect(supplyDataResult.closeFunction).toBeInstanceOf(Function);
			expect(supplyDataResult.response).toBeInstanceOf(McpToolkit);

			const tools = (supplyDataResult.response as McpToolkit).getTools();
			expect(tools).toHaveLength(1);
			expect(tools[0].name).toBe('MyTool1');
		});

		it('should support header auth', async () => {
			jest.spyOn(Client.prototype, 'connect').mockResolvedValue();
			jest.spyOn(Client.prototype, 'listTools').mockResolvedValue({
				tools: [
					{
						name: 'MyTool1',
						description: 'MyTool1 does something',
						inputSchema: { type: 'object', properties: { input: { type: 'string' } } },
					},
				],
			});

			const supplyDataResult = await new McpClientTool().supplyData.call(
				mock<ISupplyDataFunctions>({
					getNode: jest.fn(() => mock<INode>({ typeVersion: 1 })),
					getNodeParameter: jest.fn((key, _index) => {
						const parameters: Record<string, any> = {
							include: 'except',
							excludeTools: ['MyTool2'],
							authentication: 'headerAuth',
							sseEndpoint: 'https://my-mcp-endpoint.ai/sse',
						};
						return parameters[key];
					}),
					logger: { debug: jest.fn(), error: jest.fn() },
					addInputData: jest.fn(() => ({ index: 0 })),
					getCredentials: jest.fn().mockResolvedValue({ name: 'my-header', value: 'header-value' }),
				}),
				0,
			);

			expect(supplyDataResult.closeFunction).toBeInstanceOf(Function);
			expect(supplyDataResult.response).toBeInstanceOf(McpToolkit);

			const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(mock());
			const url = new URL('https://my-mcp-endpoint.ai/sse');
			expect(SSEClientTransport).toHaveBeenCalledTimes(1);
			expect(SSEClientTransport).toHaveBeenCalledWith(url, {
				eventSourceInit: { fetch: expect.any(Function) },
				requestInit: { headers: { 'my-header': 'header-value' } },
			});

			const customFetch = jest.mocked(SSEClientTransport).mock.calls[0][1]?.eventSourceInit?.fetch;
			await customFetch?.(url);
			expect(fetchSpy).toHaveBeenCalledWith(url, {
				headers: { Accept: 'text/event-stream', 'my-header': 'header-value' },
			});
		});

		it('should support bearer auth', async () => {
			jest.spyOn(Client.prototype, 'connect').mockResolvedValue();
			jest.spyOn(Client.prototype, 'listTools').mockResolvedValue({
				tools: [
					{
						name: 'MyTool1',
						description: 'MyTool1 does something',
						inputSchema: { type: 'object', properties: { input: { type: 'string' } } },
					},
				],
			});

			const supplyDataResult = await new McpClientTool().supplyData.call(
				mock<ISupplyDataFunctions>({
					getNode: jest.fn(() => mock<INode>({ typeVersion: 1 })),
					getNodeParameter: jest.fn((key, _index) => {
						const parameters: Record<string, any> = {
							include: 'except',
							excludeTools: ['MyTool2'],
							authentication: 'bearerAuth',
							sseEndpoint: 'https://my-mcp-endpoint.ai/sse',
						};
						return parameters[key];
					}),
					logger: { debug: jest.fn(), error: jest.fn() },
					addInputData: jest.fn(() => ({ index: 0 })),
					getCredentials: jest.fn().mockResolvedValue({ token: 'my-token' }),
				}),
				0,
			);

			expect(supplyDataResult.closeFunction).toBeInstanceOf(Function);
			expect(supplyDataResult.response).toBeInstanceOf(McpToolkit);

			const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(mock());
			const url = new URL('https://my-mcp-endpoint.ai/sse');
			expect(SSEClientTransport).toHaveBeenCalledTimes(1);
			expect(SSEClientTransport).toHaveBeenCalledWith(url, {
				eventSourceInit: { fetch: expect.any(Function) },
				requestInit: { headers: { Authorization: 'Bearer my-token' } },
			});

			const customFetch = jest.mocked(SSEClientTransport).mock.calls[0][1]?.eventSourceInit?.fetch;
			await customFetch?.(url);
			expect(fetchSpy).toHaveBeenCalledWith(url, {
				headers: { Accept: 'text/event-stream', Authorization: 'Bearer my-token' },
			});
		});

		it('should successfully execute a tool', async () => {
			jest.spyOn(Client.prototype, 'connect').mockResolvedValue();
			jest.spyOn(Client.prototype, 'callTool').mockResolvedValue({ content: 'Sunny' });
			jest.spyOn(Client.prototype, 'listTools').mockResolvedValue({
				tools: [
					{
						name: 'Weather Tool',
						description: 'Gets the current weather',
						inputSchema: { type: 'object', properties: { location: { type: 'string' } } },
					},
				],
			});

			const supplyDataResult = await new McpClientTool().supplyData.call(
				mock<ISupplyDataFunctions>({
					getNode: jest.fn(() =>
						mock<INode>({
							typeVersion: 1,
						}),
					),
					logger: { debug: jest.fn(), error: jest.fn() },
					addInputData: jest.fn(() => ({ index: 0 })),
				}),
				0,
			);

			expect(supplyDataResult.closeFunction).toBeInstanceOf(Function);
			expect(supplyDataResult.response).toBeInstanceOf(McpToolkit);

			const tools = (supplyDataResult.response as McpToolkit).getTools();
			const toolResult = await tools[0].invoke({ location: 'Berlin' });
			expect(toolResult).toEqual('Sunny');
		});

		it('should handle tool errors', async () => {
			jest.spyOn(Client.prototype, 'connect').mockResolvedValue();
			jest
				.spyOn(Client.prototype, 'callTool')
				.mockResolvedValue({ isError: true, content: [{ text: 'Weather unknown at location' }] });
			jest.spyOn(Client.prototype, 'listTools').mockResolvedValue({
				tools: [
					{
						name: 'Weather Tool',
						description: 'Gets the current weather',
						inputSchema: { type: 'object', properties: { location: { type: 'string' } } },
					},
				],
			});

			const supplyDataFunctions = mock<ISupplyDataFunctions>({
				getNode: jest.fn(() =>
					mock<INode>({
						typeVersion: 1,
					}),
				),
				logger: { debug: jest.fn(), error: jest.fn() },
				addInputData: jest.fn(() => ({ index: 0 })),
			});
			const supplyDataResult = await new McpClientTool().supplyData.call(supplyDataFunctions, 0);

			expect(supplyDataResult.closeFunction).toBeInstanceOf(Function);
			expect(supplyDataResult.response).toBeInstanceOf(McpToolkit);

			const tools = (supplyDataResult.response as McpToolkit).getTools();
			const toolResult = await tools[0].invoke({ location: 'Berlin' });
			expect(toolResult).toEqual('Weather unknown at location');
			expect(supplyDataFunctions.addOutputData).toHaveBeenCalledWith(
				NodeConnectionTypes.AiTool,
				0,
				new NodeOperationError(supplyDataFunctions.getNode(), 'Weather unknown at location'),
			);
		});

		it('should support setting a timeout', async () => {
			jest.spyOn(Client.prototype, 'connect').mockResolvedValue();
			const callToolSpy = jest
				.spyOn(Client.prototype, 'callTool')
				.mockRejectedValue(
					new McpError(ErrorCode.RequestTimeout, 'Request timed out', { timeout: 200 }),
				);
			jest.spyOn(Client.prototype, 'listTools').mockResolvedValue({
				tools: [
					{
						name: 'SlowTool',
						description: 'SlowTool throws a timeout',
						inputSchema: { type: 'object', properties: { input: { type: 'string' } } },
					},
				],
			});

			const mockNode = mock<INode>({ typeVersion: 1 });
			const supplyDataResult = await new McpClientTool().supplyData.call(
				mock<ISupplyDataFunctions>({
					getNode: jest.fn(() => mockNode),
					getNodeParameter: jest.fn((key, _index) => {
						const parameters: Record<string, any> = {
							'options.timeout': 200,
						};
						return parameters[key];
					}),
					logger: { debug: jest.fn(), error: jest.fn() },
					addInputData: jest.fn(() => ({ index: 0 })),
				}),
				0,
			);

			const tools = (supplyDataResult.response as McpToolkit).getTools();

			await expect(tools[0].invoke({ input: 'foo' })).resolves.toEqual(
				'MCP error -32001: Request timed out',
			);
			expect(callToolSpy).toHaveBeenCalledWith(
				expect.any(Object), // params
				expect.any(Object), // schema
				expect.objectContaining({ timeout: 200 }),
			); // options
		});
	});
});
