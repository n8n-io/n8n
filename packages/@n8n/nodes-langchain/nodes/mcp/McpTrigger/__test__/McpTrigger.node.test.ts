import type { Tool } from '@langchain/core/tools';
import type { Request, Response } from 'express';
import { mock } from 'jest-mock-extended';
import type { INode, IWebhookFunctions } from 'n8n-workflow';

import * as helpers from '@utils/helpers';

import type {
	FlushingSSEServerTransport,
	FlushingStreamableHTTPTransport,
} from '../FlushingTransport';
import type { McpServerManager } from '../McpServer';
import { McpTrigger } from '../McpTrigger.node';

const mockTool = mock<Tool>({ name: 'mockTool' });
jest.spyOn(helpers, 'getConnectedTools').mockResolvedValue([mockTool]);

const mockServerManager = mock<McpServerManager>();
jest.mock('../McpServer', () => ({
	McpServerManager: {
		instance: jest.fn().mockImplementation(() => mockServerManager),
	},
}));

describe('McpTrigger Node', () => {
	const sessionId = 'mock-session-id';
	const mockContext = mock<IWebhookFunctions>();
	const mockRequest = mock<Request>({ query: { sessionId }, path: '/custom-path' });
	const mockResponse = mock<Response>();
	let mcpTrigger: McpTrigger;

	beforeEach(() => {
		jest.clearAllMocks();

		mcpTrigger = new McpTrigger();
		mockContext.getRequestObject.mockReturnValue(mockRequest);
		mockContext.getResponseObject.mockReturnValue(mockResponse);
		mockContext.getNode.mockReturnValue({
			name: 'McpTrigger',
			typeVersion: 2,
		} as INode);
		mockServerManager.transports = {};
	});

	describe('webhook method', () => {
		it('should handle setup webhook', async () => {
			// Configure the context for setup webhook
			mockContext.getWebhookName.mockReturnValue('setup');

			// Call the webhook method
			const result = await mcpTrigger.webhook(mockContext);

			// Verify that the connectTransport method was called with correct URL
			expect(mockServerManager.createServerWithSSETransport).toHaveBeenCalledWith(
				'McpTrigger',
				'/custom-path',
				mockResponse,
			);

			// Verify the returned result has noWebhookResponse: true
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('should handle default webhook for tool execution', async () => {
			// Configure the context for default webhook (tool execution)
			mockContext.getWebhookName.mockReturnValue('default');

			// Mock the session ID retrieval and transport existence
			mockServerManager.getSessionId.mockReturnValue(sessionId);
			mockServerManager.getTransport.mockReturnValue(mock<FlushingSSEServerTransport>({}));

			// Mock that the server executes a tool and returns true
			mockServerManager.handlePostMessage.mockResolvedValueOnce(true);

			// Call the webhook method
			const result = await mcpTrigger.webhook(mockContext);

			// Verify that handlePostMessage was called with request, response and tools
			expect(mockServerManager.handlePostMessage).toHaveBeenCalledWith(mockRequest, mockResponse, [
				mockTool,
			]);

			// Verify the returned result when a tool was called
			expect(result).toEqual({
				noWebhookResponse: true,
				workflowData: [[{ json: {} }]],
			});
		});

		it('should handle default webhook when no tool was executed', async () => {
			// Configure the context for default webhook
			mockContext.getWebhookName.mockReturnValue('default');

			// Mock the session ID retrieval and transport existence
			mockServerManager.getSessionId.mockReturnValue(sessionId);
			mockServerManager.getTransport.mockReturnValue(mock<FlushingSSEServerTransport>({}));

			// Mock that the server doesn't execute a tool and returns false
			mockServerManager.handlePostMessage.mockResolvedValueOnce(false);

			// Call the webhook method
			const result = await mcpTrigger.webhook(mockContext);

			// Verify the returned result when no tool was called
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('should pass the correct server name to McpServerSingleton.instance for version > 1', async () => {
			// Configure node with version > 1 and custom name
			mockContext.getNode.mockReturnValue({
				name: 'My custom MCP server!',
				typeVersion: 1.1,
			} as INode);
			mockContext.getWebhookName.mockReturnValue('setup');
			// Call the webhook method
			await mcpTrigger.webhook(mockContext);

			// Verify that connectTransport was called with the sanitized server name
			expect(mockServerManager.createServerWithSSETransport).toHaveBeenCalledWith(
				'My_custom_MCP_server_',
				'/custom-path',
				mockResponse,
			);
		});

		it('should use default server name for version 1', async () => {
			// Configure node with version 1
			mockContext.getNode.mockReturnValue({
				typeVersion: 1,
			} as INode);
			mockContext.getWebhookName.mockReturnValue('setup');

			// Call the webhook method
			await mcpTrigger.webhook(mockContext);

			// Verify that connectTransport was called with the default server name
			expect(mockServerManager.createServerWithSSETransport).toHaveBeenCalledWith(
				'n8n-mcp-server',
				'/custom-path',
				mockResponse,
			);
		});

		it('should handle DELETE webhook for StreamableHTTP session termination', async () => {
			// Configure the context for DELETE webhook
			mockContext.getWebhookName.mockReturnValue('default');
			const mockDeleteRequest = mock<Request>({
				method: 'DELETE',
				headers: { 'mcp-session-id': sessionId },
				path: '/custom-path',
			});
			mockContext.getRequestObject.mockReturnValueOnce(mockDeleteRequest);

			// Mock existing StreamableHTTP transport
			mockServerManager.getSessionId.mockReturnValue(sessionId);
			mockServerManager.getTransport.mockReturnValue(mock<FlushingStreamableHTTPTransport>({}));

			// Call the webhook method
			const result = await mcpTrigger.webhook(mockContext);

			// Verify that handleDeleteRequest was called
			expect(mockServerManager.handleDeleteRequest).toHaveBeenCalledWith(
				mockDeleteRequest,
				mockResponse,
			);

			// Verify the returned result
			expect(result).toEqual({ noWebhookResponse: true });
		});
	});
});
