import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { mock, mockDeep } from 'vitest-mock-extended';

import * as sharedUtils from '../../shared/utils';
import { getTools } from '../listSearch';
import { McpClient } from '../McpClient.node';
import { getToolParameters } from '../resourceMapping';

describe('McpClient', () => {
	const getAuthHeaders = vi.spyOn(sharedUtils, 'getAuthHeaders');
	const connectMcpClient = vi.spyOn(sharedUtils, 'connectMcpClient');
	const mapToNodeOperationError = vi.spyOn(sharedUtils, 'mapToNodeOperationError');
	const connectMcpClientForCredential = vi.spyOn(sharedUtils, 'connectMcpClientForCredential');
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

		executeFunctions.getNode.mockReturnValue({
			id: '123',
			name: 'MCP Client',
			type: '@n8n/n8n-nodes-langchain.mcpClient',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});
		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
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
	connectMcpClientForCredential.mockResolvedValue({
		ok: true,
		result: mockDeep<Client>(),
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
			{ timeout: 10000 },
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
			{ timeout: 10000 },
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
});
