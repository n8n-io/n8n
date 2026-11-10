import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { returnJsonArray } from 'n8n-core';
import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import type { MockInstance } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import * as sharedUtils from '../../shared/utils';
import { getPrompts, getResources, getTools } from '../listSearch';
import { McpClient } from '../McpClient.node';
import { getToolParameters } from '../resourceMapping';

describe('McpClient', () => {
	let mapToNodeOperationError: MockInstance;
	let connectMcpClientForCredential: MockInstance;
	const executeFunctions = mockDeep<IExecuteFunctions>();
	const client = mockDeep<Client>();
	const defaultParams = {
		authentication: 'none',
		serverTransport: 'httpStreamable',
		endpointUrl: 'https://test.com/mcp',
		inputMode: 'json',
		jsonInput: { location: 'Berlin' },
		'tool.value': 'get_weather',
		options: { timeout: 10000, convertToBinary: false },
	};

	beforeEach(() => {
		vi.resetAllMocks();

		mapToNodeOperationError = vi.spyOn(sharedUtils, 'mapToNodeOperationError');
		connectMcpClientForCredential = vi.spyOn(sharedUtils, 'connectMcpClientForCredential');

		executeFunctions.getNode.mockReturnValue({
			id: '123',
			name: 'MCP Client',
			type: '@n8n/n8n-nodes-langchain.mcpClient',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});
		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctions.helpers.returnJsonArray.mockImplementation(returnJsonArray);
		connectMcpClientForCredential.mockResolvedValue({
			ok: true,
			result: client,
		});
	});

	it('should pass the execution cancel signal to connectMcpClientForCredential', async () => {
		const abort = new AbortController();
		executeFunctions.getExecutionCancelSignal.mockReturnValue(abort.signal);
		executeFunctions.getNodeParameter.mockImplementation(
			(key, _idx, defaultValue) => defaultParams[key as keyof typeof defaultParams] ?? defaultValue,
		);
		client.callTool.mockResolvedValue({
			content: [{ type: 'text', text: 'Weather in Berlin is sunny' }],
		});

		await new McpClient().execute.call(executeFunctions);

		expect(connectMcpClientForCredential).toHaveBeenCalledWith(
			executeFunctions,
			expect.objectContaining({
				signal: abort.signal,
			}),
		);
	});

	it('should map and throw cancelled connection results', async () => {
		const abortError = new Error('aborted');
		abortError.name = 'AbortError';
		executeFunctions.getNodeParameter.mockImplementation(
			(key, _idx, defaultValue) => defaultParams[key as keyof typeof defaultParams] ?? defaultValue,
		);
		connectMcpClientForCredential.mockResolvedValue({
			ok: false,
			error: { type: 'cancelled', error: abortError },
		});

		await expect(new McpClient().execute.call(executeFunctions)).rejects.toThrow(
			'Execution was cancelled',
		);

		expect(mapToNodeOperationError).toHaveBeenCalledWith(
			executeFunctions.getNode(),
			expect.objectContaining({ type: 'cancelled', error: abortError }),
		);
	});

	it('should handle json input mode', async () => {
		executeFunctions.getNodeParameter.mockImplementation(
			(key, _idx, defaultValue) => defaultParams[key as keyof typeof defaultParams] ?? defaultValue,
		);
		client.callTool.mockResolvedValue({
			content: [{ type: 'text', text: 'Weather in Berlin is sunny' }],
		});

		const result = await new McpClient().execute.call(executeFunctions);

		expect(result).toEqual([
			[
				{
					json: { content: [{ type: 'text', text: 'Weather in Berlin is sunny' }] },
					pairedItem: { item: 0 },
				},
			],
		]);
		expect(client.callTool).toHaveBeenCalledWith(
			{ name: 'get_weather', arguments: { location: 'Berlin' } },
			undefined,
			{ signal: undefined, timeout: 10000 },
		);
	});

	it('should handle manual input mode', async () => {
		executeFunctions.getNodeParameter.mockImplementation((key, _idx, defaultValue) => {
			const params = {
				...defaultParams,
				jsonInput: undefined,
				inputMode: 'manual',
				'parameters.value': { location: 'Berlin' },
			};
			return params[key as keyof typeof params] ?? defaultValue;
		});
		client.callTool.mockResolvedValue({
			content: [{ type: 'text', text: 'Weather in Berlin is sunny' }],
		});

		const result = await new McpClient().execute.call(executeFunctions);

		expect(result).toEqual([
			[
				{
					json: { content: [{ type: 'text', text: 'Weather in Berlin is sunny' }] },
					pairedItem: { item: 0 },
				},
			],
		]);
		expect(client.callTool).toHaveBeenCalledWith(
			{ name: 'get_weather', arguments: { location: 'Berlin' } },
			undefined,
			{ signal: undefined, timeout: 10000 },
		);
	});

	it('should try to parse text content as json', async () => {
		executeFunctions.getNodeParameter.mockImplementation(
			(key, _idx, defaultValue) => defaultParams[key as keyof typeof defaultParams] ?? defaultValue,
		);
		client.callTool.mockResolvedValue({
			content: [{ type: 'text', text: '{"answer": "Weather in Berlin is sunny"}' }],
		});

		const result = await new McpClient().execute.call(executeFunctions);

		expect(result).toEqual([
			[
				{
					json: { content: [{ type: 'text', text: { answer: 'Weather in Berlin is sunny' } }] },
					pairedItem: { item: 0 },
				},
			],
		]);
	});

	it('should merge structuredContent with content', async () => {
		executeFunctions.getNodeParameter.mockImplementation(
			(key, _idx, defaultValue) => defaultParams[key as keyof typeof defaultParams] ?? defaultValue,
		);
		client.callTool.mockResolvedValue({
			content: [{ type: 'text', text: 'Success' }],
			structuredContent: { id: '123', status: 'active' },
		});

		const result = await new McpClient().execute.call(executeFunctions);

		expect(result).toEqual([
			[
				{
					json: {
						structuredContent: { id: '123', status: 'active' },
						content: [{ type: 'text', text: 'Success' }],
					},
					pairedItem: { item: 0 },
				},
			],
		]);
	});

	it('should ignore structuredContent if it is an array', async () => {
		executeFunctions.getNodeParameter.mockImplementation(
			(key, _idx, defaultValue) => defaultParams[key as keyof typeof defaultParams] ?? defaultValue,
		);
		client.callTool.mockResolvedValue({
			content: [{ type: 'text', text: 'Success' }],
			toolResult: undefined,
			structuredContent: ['should', 'be', 'ignored'],
		});

		const result = await new McpClient().execute.call(executeFunctions);

		expect(result).toEqual([
			[
				{
					json: { content: [{ type: 'text', text: 'Success' }] },
					pairedItem: { item: 0 },
				},
			],
		]);
	});

	it('should convert images and audio to binary data when convertToBinary is true', async () => {
		executeFunctions.getNodeParameter.mockImplementation(
			(key, _idx, defaultValue) =>
				({
					...defaultParams,
					jsonInput: { foo: 'bar' },
					options: { ...defaultParams.options, convertToBinary: true },
				})[key as keyof typeof defaultParams] ?? defaultValue,
		);
		client.callTool.mockResolvedValue({
			content: [
				{ type: 'image', data: 'abcdef', mimeType: 'image/jpeg' },
				{ type: 'audio', data: 'ghijkl', mimeType: 'audio/mpeg' },
			],
		});
		executeFunctions.helpers.prepareBinaryData.mockResolvedValueOnce({
			data: 'abcdef',
			mimeType: 'image/jpeg',
		});
		executeFunctions.helpers.prepareBinaryData.mockResolvedValueOnce({
			data: 'ghijkl',
			mimeType: 'audio/mpeg',
		});

		const result = await new McpClient().execute.call(executeFunctions);

		expect(result).toEqual([
			[
				{
					json: {},
					binary: {
						data_0: {
							mimeType: 'image/jpeg',
							data: 'abcdef',
						},
						data_1: {
							mimeType: 'audio/mpeg',
							data: 'ghijkl',
						},
					},
					pairedItem: { item: 0 },
				},
			],
		]);
	});

	it('should keep images and audio as json when convertToBinary is false', async () => {
		executeFunctions.getNodeParameter.mockImplementation(
			(key, _idx, defaultValue) =>
				({
					...defaultParams,
					jsonInput: { foo: 'bar' },
					options: { ...defaultParams.options, convertToBinary: false },
				})[key as keyof typeof defaultParams] ?? defaultValue,
		);
		client.callTool.mockResolvedValue({
			content: [
				{ type: 'image', data: 'abcdef', mimeType: 'image/jpeg' },
				{ type: 'audio', data: 'ghijkl', mimeType: 'audio/mpeg' },
			],
		});

		const result = await new McpClient().execute.call(executeFunctions);

		expect(result).toEqual([
			[
				{
					json: {
						content: [
							{ type: 'image', data: 'abcdef', mimeType: 'image/jpeg' },
							{ type: 'audio', data: 'ghijkl', mimeType: 'audio/mpeg' },
						],
					},
					pairedItem: { item: 0 },
				},
			],
		]);
	});

	it('should treat isError: true as success on version 1 (legacy behavior)', async () => {
		executeFunctions.getNode.mockReturnValue({
			id: '123',
			name: 'MCP Client',
			type: '@n8n/n8n-nodes-langchain.mcpClient',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});
		executeFunctions.getNodeParameter.mockImplementation(
			(key, _idx, defaultValue) => defaultParams[key as keyof typeof defaultParams] ?? defaultValue,
		);
		client.callTool.mockResolvedValue({
			isError: true,
			content: [{ type: 'text', text: 'simulated tool-level error' }],
		});

		const result = await new McpClient().execute.call(executeFunctions);

		expect(result).toEqual([
			[
				{
					json: { content: [{ type: 'text', text: 'simulated tool-level error' }] },
					pairedItem: { item: 0 },
				},
			],
		]);
	});

	it('should throw an error if the tool result has isError: true (version 1.1+)', async () => {
		executeFunctions.getNode.mockReturnValue({
			id: '123',
			name: 'MCP Client',
			type: '@n8n/n8n-nodes-langchain.mcpClient',
			typeVersion: 1.1,
			position: [0, 0],
			parameters: {},
		});
		executeFunctions.getNodeParameter.mockImplementation(
			(key, _idx, defaultValue) => defaultParams[key as keyof typeof defaultParams] ?? defaultValue,
		);
		client.callTool.mockResolvedValue({
			isError: true,
			content: [{ type: 'text', text: 'simulated tool-level error' }],
		});

		await expect(new McpClient().execute.call(executeFunctions)).rejects.toThrow(
			'simulated tool-level error',
		);
	});

	it('should return an error as json if the tool result has isError: true and continueOnFail is true (version 1.1+)', async () => {
		executeFunctions.getNode.mockReturnValue({
			id: '123',
			name: 'MCP Client',
			type: '@n8n/n8n-nodes-langchain.mcpClient',
			typeVersion: 1.1,
			position: [0, 0],
			parameters: {},
		});
		executeFunctions.getNodeParameter.mockImplementation(
			(key, _idx, defaultValue) => defaultParams[key as keyof typeof defaultParams] ?? defaultValue,
		);
		client.callTool.mockResolvedValue({
			isError: true,
			content: [{ type: 'text', text: 'simulated tool-level error' }],
		});
		executeFunctions.continueOnFail.mockReturnValue(true);

		const result = await new McpClient().execute.call(executeFunctions);

		expect(result).toEqual([
			[{ json: { error: { message: 'simulated tool-level error' } }, pairedItem: { item: 0 } }],
		]);
	});

	it('should throw a generic error if isError: true with no text content (version 1.1+)', async () => {
		executeFunctions.getNode.mockReturnValue({
			id: '123',
			name: 'MCP Client',
			type: '@n8n/n8n-nodes-langchain.mcpClient',
			typeVersion: 1.1,
			position: [0, 0],
			parameters: {},
		});
		executeFunctions.getNodeParameter.mockImplementation(
			(key, _idx, defaultValue) => defaultParams[key as keyof typeof defaultParams] ?? defaultValue,
		);
		client.callTool.mockResolvedValue({
			isError: true,
			content: [{ type: 'image', data: 'abc', mimeType: 'image/png' }],
		});

		await expect(new McpClient().execute.call(executeFunctions)).rejects.toThrow(
			'Tool "get_weather" returned an error',
		);
	});

	it('should throw an error if the tool call fails', async () => {
		executeFunctions.getNodeParameter.mockImplementation(
			(key, _idx, defaultValue) => defaultParams[key as keyof typeof defaultParams] ?? defaultValue,
		);
		client.callTool.mockRejectedValue(new Error('Tool call failed'));

		await expect(new McpClient().execute.call(executeFunctions)).rejects.toThrow(
			'Tool call failed',
		);
	});

	it('should return an error as json if the tool call fails and continueOnFail is true', async () => {
		executeFunctions.getNodeParameter.mockImplementation(
			(key, _idx, defaultValue) => defaultParams[key as keyof typeof defaultParams] ?? defaultValue,
		);
		client.callTool.mockRejectedValue(new Error('Tool call failed'));
		executeFunctions.continueOnFail.mockReturnValue(true);

		const result = await new McpClient().execute.call(executeFunctions);

		expect(result).toEqual([
			[{ json: { error: { message: 'Tool call failed' } }, pairedItem: { item: 0 } }],
		]);
	});

	it('should close client connection after successful execution', async () => {
		executeFunctions.getNodeParameter.mockImplementation(
			(key, _idx, defaultValue) => defaultParams[key as keyof typeof defaultParams] ?? defaultValue,
		);
		client.callTool.mockResolvedValue({
			content: [{ type: 'text', text: 'result' }],
		});

		await new McpClient().execute.call(executeFunctions);

		expect(client.close).toHaveBeenCalledTimes(1);
	});

	it('should close client connection even when tool call fails', async () => {
		executeFunctions.getNodeParameter.mockImplementation(
			(key, _idx, defaultValue) => defaultParams[key as keyof typeof defaultParams] ?? defaultValue,
		);
		client.callTool.mockRejectedValue(new Error('Tool call failed'));

		await expect(new McpClient().execute.call(executeFunctions)).rejects.toThrow(
			'Tool call failed',
		);

		expect(client.close).toHaveBeenCalledTimes(1);
	});

	describe('listSearch: getTools', () => {
		it('should close client after listing tools', async () => {
			client.listTools.mockResolvedValue({
				tools: [
					{
						name: 'tool1',
						description: 'A tool',
						inputSchema: { type: 'object' },
					},
				],
			});

			const loadOptionsFunctions = mock<ILoadOptionsFunctions>({
				getNode: vi.fn().mockReturnValue({
					id: '123',
					name: 'MCP Client',
					type: '@n8n/n8n-nodes-langchain.mcpClient',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				}),
				getNodeParameter: vi.fn().mockImplementation((key: string) => {
					const params: Record<string, unknown> = {
						authentication: 'none',
						serverTransport: 'httpStreamable',
						endpointUrl: 'https://test.com/mcp',
					};
					return params[key];
				}),
			});

			await getTools.call(loadOptionsFunctions);

			expect(client.close).toHaveBeenCalledTimes(1);
		});

		it('should close client when listTools throws', async () => {
			client.listTools.mockRejectedValue(new Error('listTools failed'));

			const loadOptionsFunctions = mock<ILoadOptionsFunctions>({
				getNode: vi.fn().mockReturnValue({
					id: '123',
					name: 'MCP Client',
					type: '@n8n/n8n-nodes-langchain.mcpClient',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				}),
				getNodeParameter: vi.fn().mockImplementation((key: string) => {
					const params: Record<string, unknown> = {
						authentication: 'none',
						serverTransport: 'httpStreamable',
						endpointUrl: 'https://test.com/mcp',
					};
					return params[key];
				}),
			});

			await expect(getTools.call(loadOptionsFunctions)).rejects.toThrow('listTools failed');

			expect(client.close).toHaveBeenCalledTimes(1);
		});
	});

	describe('resourceMapping: getToolParameters', () => {
		it('should close client after getting tool parameters', async () => {
			client.listTools.mockResolvedValue({
				tools: [
					{
						name: 'tool1',
						description: 'A tool',
						inputSchema: {
							type: 'object',
							properties: {
								input: { type: 'string' },
							},
						},
					},
				],
			});

			const loadOptionsFunctions = mock<ILoadOptionsFunctions>({
				getNode: vi.fn().mockReturnValue({
					id: '123',
					name: 'MCP Client',
					type: '@n8n/n8n-nodes-langchain.mcpClient',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				}),
				getNodeParameter: vi.fn().mockImplementation((key: string) => {
					const params: Record<string, unknown> = {
						tool: 'tool1',
						authentication: 'none',
						serverTransport: 'httpStreamable',
						endpointUrl: 'https://test.com/mcp',
					};
					return params[key];
				}),
			});

			await getToolParameters.call(loadOptionsFunctions);

			expect(client.close).toHaveBeenCalledTimes(1);
		});

		it('should close client when getAllTools throws', async () => {
			client.listTools.mockRejectedValue(new Error('getAllTools failed'));

			const loadOptionsFunctions = mock<ILoadOptionsFunctions>({
				getNode: vi.fn().mockReturnValue({
					id: '123',
					name: 'MCP Client',
					type: '@n8n/n8n-nodes-langchain.mcpClient',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				}),
				getNodeParameter: vi.fn().mockImplementation((key: string) => {
					const params: Record<string, unknown> = {
						tool: 'tool1',
						authentication: 'none',
						serverTransport: 'httpStreamable',
						endpointUrl: 'https://test.com/mcp',
					};
					return params[key];
				}),
			});

			await expect(getToolParameters.call(loadOptionsFunctions)).rejects.toThrow(
				'getAllTools failed',
			);

			expect(client.close).toHaveBeenCalledTimes(1);
		});

		it('should close client when tool not found', async () => {
			client.listTools.mockResolvedValue({
				tools: [
					{
						name: 'other_tool',
						description: 'A different tool',
						inputSchema: { type: 'object' },
					},
				],
			});

			const loadOptionsFunctions = mock<ILoadOptionsFunctions>({
				getNode: vi.fn().mockReturnValue({
					id: '123',
					name: 'MCP Client',
					type: '@n8n/n8n-nodes-langchain.mcpClient',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				}),
				getNodeParameter: vi.fn().mockImplementation((key: string) => {
					const params: Record<string, unknown> = {
						tool: 'nonexistent_tool',
						authentication: 'none',
						serverTransport: 'httpStreamable',
						endpointUrl: 'https://test.com/mcp',
					};
					return params[key];
				}),
			});

			await expect(getToolParameters.call(loadOptionsFunctions)).rejects.toThrow('Tool not found');

			expect(client.close).toHaveBeenCalledTimes(1);
		});
	});

	describe('allowed domains', () => {
		it('execute passes "MCP Client" surface to the credential-aware connect helper', async () => {
			executeFunctions.getNodeParameter.mockImplementation(
				(key, _idx, defaultValue) =>
					defaultParams[key as keyof typeof defaultParams] ?? defaultValue,
			);
			client.callTool.mockResolvedValue({
				content: [{ type: 'text', text: 'ok' }],
			});

			await new McpClient().execute.call(executeFunctions);

			expect(connectMcpClientForCredential).toHaveBeenCalledWith(
				executeFunctions,
				expect.objectContaining({
					surface: 'MCP Client',
					endpointUrl: 'https://test.com/mcp',
				}),
			);
		});

		it('execute surfaces a disallowed-domain rejection from the connect helper', async () => {
			executeFunctions.getNodeParameter.mockImplementation(
				(key, _idx, defaultValue) =>
					defaultParams[key as keyof typeof defaultParams] ?? defaultValue,
			);
			connectMcpClientForCredential.mockRejectedValueOnce(
				new Error('Domain not allowed: attacker.example is not in allowed.example'),
			);

			await expect(new McpClient().execute.call(executeFunctions)).rejects.toThrow(
				/Domain not allowed/,
			);
			expect(client.callTool).not.toHaveBeenCalled();
		});

		it('getTools passes "MCP Client" surface and rejects on disallowed domain', async () => {
			const loadOptionsFunctions = mock<ILoadOptionsFunctions>({
				getNode: vi.fn().mockReturnValue({
					id: '123',
					name: 'MCP Client',
					type: '@n8n/n8n-nodes-langchain.mcpClient',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				}),
				getNodeParameter: vi.fn().mockImplementation((key: string) => {
					const params: Record<string, unknown> = {
						authentication: 'bearerAuth',
						serverTransport: 'httpStreamable',
						endpointUrl: 'https://attacker.example/mcp',
					};
					return params[key];
				}),
			});
			connectMcpClientForCredential.mockRejectedValueOnce(
				new Error('Domain not allowed: attacker.example is not in allowed.example'),
			);

			await expect(getTools.call(loadOptionsFunctions)).rejects.toThrow(/Domain not allowed/);
			expect(connectMcpClientForCredential).toHaveBeenCalledWith(
				loadOptionsFunctions,
				expect.objectContaining({ surface: 'MCP Client' }),
			);
			expect(client.listTools).not.toHaveBeenCalled();
		});

		it('getToolParameters passes "MCP Client" surface and rejects on disallowed domain', async () => {
			const loadOptionsFunctions = mock<ILoadOptionsFunctions>({
				getNode: vi.fn().mockReturnValue({
					id: '123',
					name: 'MCP Client',
					type: '@n8n/n8n-nodes-langchain.mcpClient',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				}),
				getNodeParameter: vi.fn().mockImplementation((key: string) => {
					const params: Record<string, unknown> = {
						tool: 'tool1',
						authentication: 'bearerAuth',
						serverTransport: 'httpStreamable',
						endpointUrl: 'https://attacker.example/mcp',
					};
					return params[key];
				}),
			});
			connectMcpClientForCredential.mockRejectedValueOnce(
				new Error('Domain not allowed: attacker.example is not in allowed.example'),
			);

			await expect(getToolParameters.call(loadOptionsFunctions)).rejects.toThrow(
				/Domain not allowed/,
			);
			expect(connectMcpClientForCredential).toHaveBeenCalledWith(
				loadOptionsFunctions,
				expect.objectContaining({ surface: 'MCP Client' }),
			);
			expect(client.listTools).not.toHaveBeenCalled();
		});
	});

	describe('v1.2 operations', () => {
		const v12Node = (typeVersion = 1.2) => ({
			id: '123',
			name: 'MCP Client',
			type: '@n8n/n8n-nodes-langchain.mcpClient',
			typeVersion,
			position: [0, 0] as [number, number],
			parameters: {},
		});

		const runV12 = async (params: Record<string, unknown>, typeVersion = 1.2) => {
			executeFunctions.getNode.mockReturnValue(v12Node(typeVersion));
			executeFunctions.getNodeParameter.mockImplementation((key, _idx, defaultValue) => {
				const merged: Record<string, unknown> = {
					...defaultParams,
					options: { ...defaultParams.options, convertToBinary: true },
					operation: 'executeTool',
					...params,
				};
				return merged[key] ?? defaultValue;
			});

			return await new McpClient().execute.call(executeFunctions);
		};

		it('does not read the operation parameter for v1.1', async () => {
			executeFunctions.getNode.mockReturnValue(v12Node(1.1));
			executeFunctions.getNodeParameter.mockImplementation((key, _idx, defaultValue) => {
				if (key === 'operation') {
					throw new Error('operation must not be read for v1.1');
				}
				return (defaultParams as Record<string, unknown>)[key] ?? defaultValue;
			});
			client.callTool.mockResolvedValue({
				content: [{ type: 'text', text: 'ok' }],
			});

			await new McpClient().execute.call(executeFunctions);

			expect(client.callTool).toHaveBeenCalledTimes(1);
			expect(client.listResources).not.toHaveBeenCalled();
		});

		it('runs executeTool for v1.2 with the v1.1 arguments', async () => {
			client.callTool.mockResolvedValue({
				content: [{ type: 'text', text: 'ok' }],
			});

			const result = await runV12({ operation: 'executeTool' });

			expect(client.callTool).toHaveBeenCalledWith(
				{ name: 'get_weather', arguments: { location: 'Berlin' } },
				undefined,
				{ signal: undefined, timeout: 10000 },
			);
			expect(result).toEqual([
				[
					{
						json: { content: [{ type: 'text', text: 'ok' }] },
						pairedItem: { item: 0 },
					},
				],
			]);
		});

		it('keeps images as JSON when convertToBinary is false on v1.2 executeTool', async () => {
			client.callTool.mockResolvedValue({
				content: [{ type: 'image', data: 'abcdef', mimeType: 'image/png' }],
			});

			const result = await runV12({
				operation: 'executeTool',
				options: { timeout: 10000, convertToBinary: false },
			});

			expect(result).toEqual([
				[
					{
						json: { content: [{ type: 'image', data: 'abcdef', mimeType: 'image/png' }] },
						pairedItem: { item: 0 },
					},
				],
			]);
			expect(executeFunctions.helpers.prepareBinaryData).not.toHaveBeenCalled();
		});

		it('lists resources for v1.2', async () => {
			client.listResources.mockResolvedValue({
				resources: [{ uri: 'mem://a', name: 'a' }],
			});

			const result = await runV12({ operation: 'listResources' });

			expect(result).toEqual([[{ json: { uri: 'mem://a', name: 'a' }, pairedItem: { item: 0 } }]]);
			expect(client.close).toHaveBeenCalledTimes(1);
		});

		it('lists resource templates for v1.2', async () => {
			client.listResourceTemplates.mockResolvedValue({
				resourceTemplates: [{ uriTemplate: 'mem://{id}', name: 'templates' }],
			});

			const result = await runV12({ operation: 'listResourceTemplates' });

			expect(result).toEqual([
				[{ json: { uriTemplate: 'mem://{id}', name: 'templates' }, pairedItem: { item: 0 } }],
			]);
			expect(client.close).toHaveBeenCalledTimes(1);
		});

		it('lists prompts for v1.2', async () => {
			client.listPrompts.mockResolvedValue({
				prompts: [{ name: 'p', description: 'A prompt' }],
			});

			const result = await runV12({ operation: 'listPrompts' });

			expect(result).toEqual([
				[{ json: { name: 'p', description: 'A prompt' }, pairedItem: { item: 0 } }],
			]);
			expect(client.close).toHaveBeenCalledTimes(1);
		});

		it('reads a text resource for v1.2', async () => {
			client.readResource.mockResolvedValue({
				contents: [{ uri: 'mem://a', text: '{"a":1}' }],
			});

			const result = await runV12({
				operation: 'readResource',
				resourceUri: 'mem://a',
			});

			expect(client.readResource).toHaveBeenCalledWith(
				{ uri: 'mem://a' },
				expect.objectContaining({ timeout: 10000 }),
			);
			expect(result).toEqual([
				[
					{
						json: { uri: 'mem://a', contents: [{ uri: 'mem://a', text: { a: 1 } }] },
						pairedItem: { item: 0 },
					},
				],
			]);
			expect(client.close).toHaveBeenCalledTimes(1);
		});

		it('preserves non-JSON resource text as a string', async () => {
			client.readResource.mockResolvedValue({
				contents: [{ uri: 'mem://a', text: 'plain text' }],
			});

			const result = await runV12({
				operation: 'readResource',
				resourceUri: 'mem://a',
			});

			expect(result).toEqual([
				[
					{
						json: { uri: 'mem://a', contents: [{ uri: 'mem://a', text: 'plain text' }] },
						pairedItem: { item: 0 },
					},
				],
			]);
		});

		it('gets a prompt and keeps text as a string', async () => {
			client.getPrompt.mockResolvedValue({
				description: 'A prompt',
				messages: [{ role: 'user', content: { type: 'text', text: '{"a":1}' } }],
			});

			const result = await runV12({
				operation: 'getPrompt',
				promptName: 'p',
				promptArguments: {},
			});

			expect(client.getPrompt).toHaveBeenCalledWith(
				{ name: 'p' },
				expect.objectContaining({ timeout: 10000 }),
			);
			expect(result).toEqual([
				[
					{
						json: {
							description: 'A prompt',
							messages: [{ role: 'user', content: { type: 'text', text: '{"a":1}' } }],
						},
						pairedItem: { item: 0 },
					},
				],
			]);
			expect(client.close).toHaveBeenCalledTimes(1);
		});

		it('maps a missing resources capability to a NodeOperationError', async () => {
			client.listResources.mockRejectedValue(
				new McpError(ErrorCode.MethodNotFound, 'Method not found'),
			);

			await expect(runV12({ operation: 'listResources' })).rejects.toThrow(
				'This MCP server does not support resources (required for "resources/list").',
			);
		});

		it('keeps the server message as the capability error description', async () => {
			client.listResources.mockRejectedValue(
				new McpError(ErrorCode.MethodNotFound, 'Method not found'),
			);

			await expect(runV12({ operation: 'listResources' })).rejects.toMatchObject({
				description: expect.stringContaining('Method not found'),
			});
		});

		it('maps a missing prompts capability to a NodeOperationError', async () => {
			client.getPrompt.mockRejectedValue(
				new McpError(ErrorCode.MethodNotFound, 'Method not found'),
			);

			await expect(runV12({ operation: 'getPrompt', promptName: 'p' })).rejects.toThrow(
				'This MCP server does not support prompts (required for "prompts/get").',
			);
		});

		it('returns a capability error as json when continueOnFail is true', async () => {
			client.getPrompt.mockRejectedValue(
				new McpError(ErrorCode.MethodNotFound, 'Method not found'),
			);
			executeFunctions.continueOnFail.mockReturnValue(true);

			const result = await runV12({ operation: 'getPrompt', promptName: 'p' });

			expect(result).toEqual([
				[
					{
						json: {
							error: {
								message: 'This MCP server does not support prompts (required for "prompts/get").',
							},
						},
						pairedItem: { item: 0 },
					},
				],
			]);
		});

		it('succeeds when the server does not advertise resources but returns data', async () => {
			client.listResources.mockResolvedValue({
				resources: [{ uri: 'mem://a', name: 'a' }],
			});

			const result = await runV12({ operation: 'listResources' });

			expect(result).toEqual([[{ json: { uri: 'mem://a', name: 'a' }, pairedItem: { item: 0 } }]]);
			expect(client.getServerCapabilities).not.toHaveBeenCalled();
		});

		it('returns an empty list without an error', async () => {
			client.listResources.mockResolvedValue({ resources: [] });

			const result = await runV12({ operation: 'listResources' });

			expect(result).toEqual([[]]);
		});

		it('aggregates multiple pages', async () => {
			client.listResources
				.mockResolvedValueOnce({
					resources: [{ uri: 'mem://a', name: 'a' }],
					nextCursor: 'c',
				})
				.mockResolvedValueOnce({
					resources: [{ uri: 'mem://b', name: 'b' }],
				});

			const result = await runV12({ operation: 'listResources' });

			expect(result).toEqual([
				[
					{ json: { uri: 'mem://a', name: 'a' }, pairedItem: { item: 0 } },
					{ json: { uri: 'mem://b', name: 'b' }, pairedItem: { item: 0 } },
				],
			]);
			expect(client.listResources).toHaveBeenNthCalledWith(
				1,
				{ cursor: undefined },
				expect.objectContaining({}),
			);
			expect(client.listResources).toHaveBeenNthCalledWith(
				2,
				{ cursor: 'c' },
				expect.objectContaining({}),
			);
		});

		it('stops at 100 pages and returns a truncated result instead of throwing', async () => {
			client.listResources.mockImplementation(async (params) => {
				const page = params?.cursor === undefined ? 0 : Number(params.cursor);
				return {
					resources: [{ uri: `mem://${page}`, name: `r${page}` }],
					nextCursor: String(page + 1),
				};
			});

			const result = await runV12({ operation: 'listResources' });

			const items = result?.[0] ?? [];
			expect(items).toHaveLength(100);
			expect(items[0]).toEqual({
				json: { uri: 'mem://0', name: 'r0', truncated: true },
				pairedItem: { item: 0 },
			});
			expect(client.listResources).toHaveBeenCalledTimes(100);
		});

		it('stops after collecting the page whose continuation cursor repeats', async () => {
			client.listResources
				.mockResolvedValueOnce({
					resources: [{ uri: 'mem://a', name: 'a' }],
					nextCursor: 'c',
				})
				.mockResolvedValueOnce({
					resources: [{ uri: 'mem://b', name: 'b' }],
					nextCursor: 'c',
				});

			const result = await runV12({ operation: 'listResources' });

			expect(result).toEqual([
				[
					{
						json: { uri: 'mem://a', name: 'a', truncated: true },
						pairedItem: { item: 0 },
					},
					{
						json: { uri: 'mem://b', name: 'b', truncated: true },
						pairedItem: { item: 0 },
					},
				],
			]);
			expect(client.listResources).toHaveBeenCalledTimes(2);
		});

		it('converts resource blobs to binary when convertToBinary is true', async () => {
			client.readResource.mockResolvedValue({
				contents: [{ uri: 'mem://a', blob: 'aGVsbG8=', mimeType: 'text/plain' }],
			});
			executeFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: 'hello',
				mimeType: 'text/plain',
			});

			const result = await runV12({
				operation: 'readResource',
				resourceUri: 'mem://a',
				options: { timeout: 10000, convertToBinary: true },
			});

			expect(result).toEqual([
				[
					{
						json: {
							uri: 'mem://a',
							contents: [{ uri: 'mem://a', mimeType: 'text/plain', binaryKey: 'data_0' }],
						},
						binary: { data_0: { data: 'hello', mimeType: 'text/plain' } },
						pairedItem: { item: 0 },
					},
				],
			]);
		});

		it('keeps resource blobs as base64 when convertToBinary is false', async () => {
			client.readResource.mockResolvedValue({
				contents: [{ uri: 'mem://a', blob: 'aGVsbG8=', mimeType: 'text/plain' }],
			});

			const result = await runV12({
				operation: 'readResource',
				resourceUri: 'mem://a',
				options: { timeout: 10000, convertToBinary: false },
			});

			expect(result).toEqual([
				[
					{
						json: {
							uri: 'mem://a',
							contents: [{ uri: 'mem://a', blob: 'aGVsbG8=', mimeType: 'text/plain' }],
						},
						pairedItem: { item: 0 },
					},
				],
			]);
		});

		it('converts mixed and multiple resource contents in order', async () => {
			client.readResource.mockResolvedValue({
				contents: [
					{ uri: 'mem://a', text: 'hello' },
					{ uri: 'mem://b', blob: 'aGVsbG8=', mimeType: 'image/png' },
					{ uri: 'mem://c', blob: 'd29ybGQ=', mimeType: 'image/jpeg' },
				],
			});
			executeFunctions.helpers.prepareBinaryData
				.mockResolvedValueOnce({ data: 'hello', mimeType: 'image/png' })
				.mockResolvedValueOnce({ data: 'world', mimeType: 'image/jpeg' });

			const result = await runV12({
				operation: 'readResource',
				resourceUri: 'mem://a',
				options: { timeout: 10000, convertToBinary: true },
			});

			expect(result).toEqual([
				[
					{
						json: {
							uri: 'mem://a',
							contents: [
								{ uri: 'mem://a', text: 'hello' },
								{ uri: 'mem://b', mimeType: 'image/png', binaryKey: 'data_0' },
								{ uri: 'mem://c', mimeType: 'image/jpeg', binaryKey: 'data_1' },
							],
						},
						binary: {
							data_0: { data: 'hello', mimeType: 'image/png' },
							data_1: { data: 'world', mimeType: 'image/jpeg' },
						},
						pairedItem: { item: 0 },
					},
				],
			]);
		});

		it('accepts __proto__ as a prompt argument name without polluting Object.prototype', async () => {
			const unsafeName = '__proto__';
			client.getPrompt.mockResolvedValue({ messages: [] });

			await runV12({
				operation: 'getPrompt',
				promptName: 'p',
				promptArguments: { arguments: [{ name: unsafeName, value: 'x' }] },
			});

			const call = client.getPrompt.mock.calls[0][0];
			expect(call.arguments?.['__proto__']).toBe('x');
			expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
		});

		it('accepts constructor as a prompt argument name', async () => {
			const name = 'constructor';
			client.getPrompt.mockResolvedValue({ messages: [] });

			await runV12({
				operation: 'getPrompt',
				promptName: 'p',
				promptArguments: { arguments: [{ name, value: 'x' }] },
			});

			const call = client.getPrompt.mock.calls[0][0];
			expect(call.arguments?.['constructor']).toBe('x');
		});

		it('rejects an empty prompt argument name', async () => {
			await expect(
				runV12({
					operation: 'getPrompt',
					promptName: 'p',
					promptArguments: { arguments: [{ name: '', value: 'x' }] },
				}),
			).rejects.toThrow('Prompt argument name must be a non-empty string.');
		});

		it('passes safe prompt arguments through and leaves Object.prototype unchanged', async () => {
			client.getPrompt.mockResolvedValue({
				messages: [{ role: 'user', content: { type: 'text', text: 'ok' } }],
			});

			await runV12({
				operation: 'getPrompt',
				promptName: 'p',
				promptArguments: { arguments: [{ name: 'Text', value: 'hello' }] },
			});

			expect(client.getPrompt).toHaveBeenCalledWith(
				{ name: 'p', arguments: expect.objectContaining({ Text: 'hello' }) },
				expect.objectContaining({ timeout: 10000 }),
			);
			expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
		});

		it('converts an embedded resource blob in a prompt', async () => {
			client.getPrompt.mockResolvedValue({
				messages: [
					{
						role: 'user',
						content: {
							type: 'resource',
							resource: { uri: 'mem://a', blob: 'aGVsbG8=', mimeType: 'text/plain' },
						},
					},
				],
			});
			executeFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: 'hello',
				mimeType: 'text/plain',
			});

			const result = await runV12({
				operation: 'getPrompt',
				promptName: 'p',
				options: { timeout: 10000, convertToBinary: true },
			});

			expect(result).toEqual([
				[
					{
						json: {
							messages: [
								{
									role: 'user',
									content: {
										type: 'resource',
										resource: { uri: 'mem://a', mimeType: 'text/plain', binaryKey: 'data_0' },
									},
								},
							],
						},
						binary: { data_0: { data: 'hello', mimeType: 'text/plain' } },
						pairedItem: { item: 0 },
					},
				],
			]);
		});

		it('keeps an embedded resource blob as base64 when convertToBinary is false', async () => {
			client.getPrompt.mockResolvedValue({
				messages: [
					{
						role: 'user',
						content: {
							type: 'resource',
							resource: { uri: 'mem://a', blob: 'aGVsbG8=', mimeType: 'text/plain' },
						},
					},
				],
			});

			const result = await runV12({
				operation: 'getPrompt',
				promptName: 'p',
				options: { timeout: 10000, convertToBinary: false },
			});

			expect(result).toEqual([
				[
					{
						json: {
							messages: [
								{
									role: 'user',
									content: {
										type: 'resource',
										resource: { uri: 'mem://a', blob: 'aGVsbG8=', mimeType: 'text/plain' },
									},
								},
							],
						},
						pairedItem: { item: 0 },
					},
				],
			]);
		});

		it('converts prompt image content to binary when convertToBinary is true', async () => {
			client.getPrompt.mockResolvedValue({
				messages: [
					{
						role: 'user',
						content: { type: 'image', data: 'aGVsbG8=', mimeType: 'image/png' },
					},
				],
			});
			executeFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: 'hello',
				mimeType: 'image/png',
			});

			const result = await runV12({
				operation: 'getPrompt',
				promptName: 'p',
				options: { timeout: 10000, convertToBinary: true },
			});

			expect(result).toEqual([
				[
					{
						json: {
							messages: [
								{
									role: 'user',
									content: { type: 'image', mimeType: 'image/png', binaryKey: 'data_0' },
								},
							],
						},
						binary: { data_0: { data: 'hello', mimeType: 'image/png' } },
						pairedItem: { item: 0 },
					},
				],
			]);
		});

		it('converts prompt audio content to binary when convertToBinary is true', async () => {
			client.getPrompt.mockResolvedValue({
				messages: [
					{
						role: 'assistant',
						content: { type: 'audio', data: 'aGVsbG8=', mimeType: 'audio/mpeg' },
					},
				],
			});
			executeFunctions.helpers.prepareBinaryData.mockResolvedValue({
				data: 'hello',
				mimeType: 'audio/mpeg',
			});

			const result = await runV12({
				operation: 'getPrompt',
				promptName: 'p',
				options: { timeout: 10000, convertToBinary: true },
			});

			expect(result).toEqual([
				[
					{
						json: {
							messages: [
								{
									role: 'assistant',
									content: { type: 'audio', mimeType: 'audio/mpeg', binaryKey: 'data_0' },
								},
							],
						},
						binary: { data_0: { data: 'hello', mimeType: 'audio/mpeg' } },
						pairedItem: { item: 0 },
					},
				],
			]);
		});

		it('keeps prompt image content as base64 when convertToBinary is false', async () => {
			client.getPrompt.mockResolvedValue({
				messages: [
					{
						role: 'user',
						content: { type: 'image', data: 'aGVsbG8=', mimeType: 'image/png' },
					},
				],
			});

			const result = await runV12({
				operation: 'getPrompt',
				promptName: 'p',
				options: { timeout: 10000, convertToBinary: false },
			});

			expect(result).toEqual([
				[
					{
						json: {
							messages: [
								{
									role: 'user',
									content: { type: 'image', data: 'aGVsbG8=', mimeType: 'image/png' },
								},
							],
						},
						pairedItem: { item: 0 },
					},
				],
			]);
		});

		it('maps a connection failure before the loop and does not close the client', async () => {
			connectMcpClientForCredential.mockResolvedValueOnce({
				ok: false,
				error: { type: 'connection', error: new Error('nope') },
			});

			await expect(runV12({ operation: 'listResources' })).rejects.toThrow(
				'Could not connect to your MCP server',
			);
			expect(client.close).not.toHaveBeenCalled();
		});

		it('passes the surface and the cancel signal to the connect helper for v1.2', async () => {
			const abort = new AbortController();
			executeFunctions.getExecutionCancelSignal.mockReturnValue(abort.signal);
			client.listResources.mockResolvedValue({ resources: [] });

			await runV12({ operation: 'listResources' });

			expect(connectMcpClientForCredential).toHaveBeenCalledWith(
				executeFunctions,
				expect.objectContaining({
					surface: 'MCP Client',
					signal: abort.signal,
				}),
			);
		});
	});

	describe('listSearch: getResources and getPrompts', () => {
		const mockLoadOptions = () =>
			mock<ILoadOptionsFunctions>({
				getNode: vi.fn().mockReturnValue({
					id: '123',
					name: 'MCP Client',
					type: '@n8n/n8n-nodes-langchain.mcpClient',
					typeVersion: 1.2,
					position: [0, 0],
					parameters: {},
				}),
				getNodeParameter: vi.fn().mockImplementation((key: string) => {
					const params: Record<string, unknown> = {
						authentication: 'none',
						serverTransport: 'httpStreamable',
						endpointUrl: 'https://test.com/mcp',
					};
					return params[key];
				}),
			});

		it('lists resources and closes the client', async () => {
			client.listResources.mockResolvedValue({
				resources: [{ uri: 'mem://a', name: 'Resource', description: 'A resource' }],
				nextCursor: 'c',
			});

			const result = await getResources.call(mockLoadOptions());

			expect(result).toEqual({
				results: [{ name: 'Resource', value: 'mem://a', description: 'A resource' }],
				paginationToken: 'c',
			});
			expect(client.close).toHaveBeenCalledTimes(1);
		});

		it('returns only the resources that match the filter', async () => {
			client.listResources.mockResolvedValue({
				resources: [
					{ uri: 'mem://alpha', name: 'Alpha' },
					{ uri: 'mem://beta', name: 'Beta' },
					{ uri: 'mem://gamma', name: 'Gamma' },
				],
			});

			const result = await getResources.call(mockLoadOptions(), 'beta');

			expect(result.results).toEqual([{ name: 'Beta', value: 'mem://beta' }]);
			expect(client.close).toHaveBeenCalledTimes(1);
		});

		it('returns an empty result when the server does not support resources', async () => {
			client.listResources.mockRejectedValue(
				new McpError(ErrorCode.MethodNotFound, 'Method not found'),
			);

			const result = await getResources.call(mockLoadOptions());

			expect(result).toEqual({ results: [] });
			expect(client.close).toHaveBeenCalledTimes(1);
		});

		it('surfaces other resource list errors and closes the client', async () => {
			client.listResources.mockRejectedValue(new Error('listResources failed'));

			await expect(getResources.call(mockLoadOptions())).rejects.toThrow('listResources failed');
			expect(client.close).toHaveBeenCalledTimes(1);
		});

		it('throws a mapped error when the connection for resources fails', async () => {
			const error = { type: 'auth' as const, error: new Error('unauthorized') };
			connectMcpClientForCredential.mockResolvedValueOnce({ ok: false, error });

			await expect(getResources.call(mockLoadOptions())).rejects.toThrow('Authentication failed');
			expect(mapToNodeOperationError).toHaveBeenCalledWith(expect.anything(), error);
			expect(client.listResources).not.toHaveBeenCalled();
		});

		it('lists prompts and closes the client', async () => {
			client.listPrompts.mockResolvedValue({
				prompts: [{ name: 'Prompt', description: 'A prompt' }],
			});

			const result = await getPrompts.call(mockLoadOptions());

			expect(result).toEqual({
				results: [{ name: 'Prompt', value: 'Prompt', description: 'A prompt' }],
				paginationToken: undefined,
			});
			expect(client.close).toHaveBeenCalledTimes(1);
		});

		it('returns an empty result when the server does not support prompts', async () => {
			client.listPrompts.mockRejectedValue(
				new McpError(ErrorCode.MethodNotFound, 'Method not found'),
			);

			const result = await getPrompts.call(mockLoadOptions());

			expect(result).toEqual({ results: [] });
			expect(client.close).toHaveBeenCalledTimes(1);
		});

		it('surfaces other prompt list errors and closes the client', async () => {
			client.listPrompts.mockRejectedValue(new Error('listPrompts failed'));

			await expect(getPrompts.call(mockLoadOptions())).rejects.toThrow('listPrompts failed');
			expect(client.close).toHaveBeenCalledTimes(1);
		});

		it('throws a mapped error when the connection for prompts fails', async () => {
			const error = { type: 'auth' as const, error: new Error('unauthorized') };
			connectMcpClientForCredential.mockResolvedValueOnce({ ok: false, error });

			await expect(getPrompts.call(mockLoadOptions())).rejects.toThrow('Authentication failed');
			expect(mapToNodeOperationError).toHaveBeenCalledWith(expect.anything(), error);
			expect(client.listPrompts).not.toHaveBeenCalled();
		});
	});
});
