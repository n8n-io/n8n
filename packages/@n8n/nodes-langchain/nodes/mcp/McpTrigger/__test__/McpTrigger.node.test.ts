import { jest } from '@jest/globals';
import type { Tool } from '@langchain/core/tools';
import type { Request, Response } from 'express';
import { mock } from 'jest-mock-extended';
import type { IWebhookFunctions } from 'n8n-workflow';

import type { McpServer } from '../McpServer';
import { McpTrigger } from '../McpTrigger.node';

const mockTool = mock<Tool>({ name: 'mockTool' });
jest.mock('@utils/helpers', () => ({
	getConnectedTools: jest.fn().mockImplementation(() => [mockTool]),
}));

const mockServer = mock<McpServer>();
jest.mock('../McpServer', () => ({
	McpServerSingleton: {
		instance: jest.fn().mockImplementation(() => mockServer),
	},
}));

describe('McpTrigger Node', () => {
	const sessionId = 'mock-session-id';
	const mockContext = mock<IWebhookFunctions>();
	const mockRequest = mock<Request>({ query: { sessionId }, path: '/custom-path/sse' });
	const mockResponse = mock<Response>();
	let mcpTrigger: McpTrigger;

	beforeEach(() => {
		jest.clearAllMocks();

		mcpTrigger = new McpTrigger();

		mockContext.getRequestObject.mockReturnValue(mockRequest);
		mockContext.getResponseObject.mockReturnValue(mockResponse);
	});

	describe('webhook method', () => {
		it('should handle setup webhook', async () => {
			// Configure the context for setup webhook
			mockContext.getWebhookName.mockReturnValue('setup');

			// Call the webhook method
			const result = await mcpTrigger.webhook(mockContext);

			// Verify that the connectTransport method was called with correct URL
			expect(mockServer.connectTransport).toHaveBeenCalledWith(
				'/custom-path/messages',
				mockResponse,
			);

			// Verify the returned result has noWebhookResponse: true
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('should handle default webhook for tool execution', async () => {
			// Configure the context for default webhook (tool execution)
			mockContext.getWebhookName.mockReturnValue('default');

			// Mock that the server executes a tool and returns true
			mockServer.handlePostMessage.mockResolvedValueOnce(true);

			// Call the webhook method
			const result = await mcpTrigger.webhook(mockContext);

			// Verify that handlePostMessage was called with request, response and tools
			expect(mockServer.handlePostMessage).toHaveBeenCalledWith(mockRequest, mockResponse, [
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

			// Mock that the server doesn't execute a tool and returns false
			mockServer.handlePostMessage.mockResolvedValueOnce(false);

			// Call the webhook method
			const result = await mcpTrigger.webhook(mockContext);

			// Verify the returned result when no tool was called
			expect(result).toEqual({ noWebhookResponse: true });
		});
	});
});
