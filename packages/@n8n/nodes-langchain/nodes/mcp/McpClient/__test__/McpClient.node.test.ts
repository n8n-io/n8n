import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import * as sharedUtils from '../../shared/utils';
import { McpClient } from '../McpClient.node';

describe('McpClient', () => {
	const getAuthHeaders = jest.spyOn(sharedUtils, 'getAuthHeaders');
	const connectMcpClient = jest.spyOn(sharedUtils, 'connectMcpClient');
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
		jest.resetAllMocks();

		executeFunctions.getNode.mockReturnValue({
			id: '123',
			name: 'MCP Client',
			type: '@n8n/n8n-nodes-langchain.mcpClient',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});
		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		getAuthHeaders.mockResolvedValue({ headers: {} });
		connectMcpClient.mockResolvedValue({
			ok: true,
			result: client,
		});
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
});
