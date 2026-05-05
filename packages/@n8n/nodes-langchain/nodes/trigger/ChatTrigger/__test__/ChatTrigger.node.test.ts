import { ChatTriggerConfig } from '@n8n/config/src';
import { Container } from '@n8n/di';
import type { Request, Response } from 'express';
import type { INode, IWebhookFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ChatTrigger } from '../ChatTrigger.node';
import type { LoadPreviousSessionChatOption } from '../types';

vi.mock('../GenericFunctions', () => ({
	validateAuth: vi.fn(),
}));

const INBOUND_TRIGGER_AUTHENTICATION_BUILDER_HINT =
	"Default to 'none'. n8n exposes inbound trigger URLs publicly by design. Only select an authentication method when the user explicitly asks to authenticate inbound traffic.";

describe('ChatTrigger Node', () => {
	const mockContext = mock<IWebhookFunctions>();
	const mockRequest = mock<Request>();
	const mockResponse = mock<Response>();
	let chatTrigger: ChatTrigger;
	let chatTriggerConfig: ChatTriggerConfig;

	beforeEach(() => {
		vi.clearAllMocks();

		chatTriggerConfig = new ChatTriggerConfig();
		vi.mocked(Container.get).mockReturnValue(chatTriggerConfig as never);
		chatTrigger = new ChatTrigger();
		Container.set(ChatTriggerConfig, chatTriggerConfig);

		mockResponse.status.mockReturnValue(mockResponse);
		mockResponse.send.mockReturnValue(mockResponse);
		mockResponse.end.mockReturnValue(mockResponse);
		mockResponse.writeHead.mockReturnValue(mockResponse);
		mockResponse.flushHeaders.mockImplementation(() => mockResponse);

		// Provide socket methods required by the streaming keepalive configuration
		mockRequest.socket = {
			...mockRequest.socket,
			setTimeout: vi.fn(),
			setNoDelay: vi.fn(),
			setKeepAlive: vi.fn(),
		} as unknown as Request['socket'];

		mockContext.getRequestObject.mockReturnValue(mockRequest);
		mockContext.getResponseObject.mockReturnValue(mockResponse);
		mockContext.getNode.mockReturnValue({
			name: 'Chat Trigger',
			type: 'n8n-nodes-langchain.chatTrigger',
			typeVersion: 1,
		} as INode);
		mockContext.getMode.mockReturnValue('webhook');
		mockContext.getWebhookName.mockReturnValue('default');
		mockContext.getBodyData.mockReturnValue({ message: 'Hello' });
		mockContext.helpers = {
			returnJsonArray: vi.fn().mockReturnValue([]),
		} as unknown as IWebhookFunctions['helpers'];
		mockContext.getNodeParameter.mockImplementation(
			(
				paramName: string,
				defaultValue?: boolean | string | object,
			): boolean | string | object | undefined => {
				if (paramName === 'public') return true;
				if (paramName === 'mode') return 'hostedChat';
				if (paramName === 'options') return {};
				if (paramName === 'availableInChat') return false;
				if (paramName === 'authentication') return 'none';
				return defaultValue;
			},
		);
	});

	describe('description', () => {
		beforeEach(() => {
			mockContext.getBodyData.mockReturnValue({ action: 'loadPreviousSession' });
		});

		it('should tell builders to keep inbound authentication disabled unless requested', async () => {
			// Call the webhook method
			const result = await chatTrigger.webhook(mockContext);

			// Verify the returned result contains empty data array
			expect(result).toEqual({
				webhookResponse: { data: [] },
			});
		});

		it('should return empty array when loadPreviousSession is "notSupported"', async () => {
			// Mock options with notSupported loadPreviousSession
			mockContext.getNodeParameter.mockImplementation(
				(
					paramName: string,
					defaultValue?: boolean | string | object,
				): boolean | string | object | undefined => {
					if (paramName === 'public') return true;
					if (paramName === 'mode') return 'hostedChat';
					if (paramName === 'options') return { loadPreviousSession: 'notSupported' };
					return defaultValue;
				},
			);

			// Call the webhook method
			const result = await chatTrigger.webhook(mockContext);

			// Verify the returned result contains empty data array
			expect(result).toEqual({
				webhookResponse: { data: [] },
			});
		});

		it('should handle loadPreviousSession="memory" correctly', async () => {
			const authParam = chatTrigger.description.properties.find(
				(property) => property.name === 'authentication',
			);

			// Mock chat history data
			const mockMessages = [
				{ toJSON: () => ({ content: 'Message 1' }) },
				{ toJSON: () => ({ content: 'Message 2' }) },
			];

			// Mock memory with chat history
			const mockMemory = {
				chatHistory: {
					getMessages: vi.fn().mockReturnValueOnce(mockMessages),
				},
			};

			// Mock options with memory loadPreviousSession
			mockContext.getNodeParameter.mockImplementation(
				(
					paramName: string,
					defaultValue?: boolean | string | object,
				): boolean | string | object | undefined => {
					if (paramName === 'public') return true;
					if (paramName === 'mode') return 'hostedChat';
					if (paramName === 'options')
						return { loadPreviousSession: 'memory' as LoadPreviousSessionChatOption };
					return defaultValue;
				},
			);

			// Mock getInputConnectionData to return memory
			mockContext.getInputConnectionData.mockResolvedValue(mockMemory);

			// Call the webhook method
			const result = await chatTrigger.webhook(mockContext);

			// Verify the returned result contains messages from memory
			expect(result).toEqual({
				webhookResponse: {
					data: [{ content: 'Message 1' }, { content: 'Message 2' }],
				},
			});
			expect(authParam).toMatchObject({
				default: 'none',
				builderHint: {
					message: INBOUND_TRIGGER_AUTHENTICATION_BUILDER_HINT,
				},
			});
		});
	});

	describe('webhook method', () => {
		it('returns 404 for public chat when instance policy disables public chat', async () => {
			chatTriggerConfig.disablePublicChat = true;

			const result = await chatTrigger.webhook(mockContext);

			expect(mockContext.getNodeParameter).not.toHaveBeenCalledWith('public', false);
			expect(mockResponse.status).toHaveBeenCalledWith(404);
			expect(mockResponse.end).toHaveBeenCalled();
			expect(result).toEqual({
				noWebhookResponse: true,
			});
		});

		it('allows public chat when instance policy is disabled', async () => {
			chatTriggerConfig.disablePublicChat = false;

			const result = await chatTrigger.webhook(mockContext);

			expect(mockContext.getNodeParameter).toHaveBeenCalledWith('public', false);
			expect(mockResponse.status).not.toHaveBeenCalledWith(404);
			expect(result).toEqual({
				webhookResponse: { status: 200 },
				workflowData: expect.any(Array),
			});
		});

		it('should enable streaming when availableInChat is true and responseMode is not set', async () => {
			// Mock options with availableInChat true and no responseMode
			mockContext.getNodeParameter.mockImplementation(
				(
					paramName: string,
					defaultValue?: boolean | string | object,
				): boolean | string | object | undefined => {
					if (paramName === 'public') return true;
					if (paramName === 'mode') return 'hostedChat';
					if (paramName === 'options') return {};
					if (paramName === 'availableInChat') return true;
					return defaultValue;
				},
			);

			// Call the webhook method
			const result = await chatTrigger.webhook(mockContext);

			// Verify streaming headers are set
			expect(mockResponse.writeHead).toHaveBeenCalledWith(200, {
				'Content-Type': 'application/json; charset=utf-8',
				'Transfer-Encoding': 'chunked',
				'Cache-Control': 'no-cache, no-transform',
				Connection: 'keep-alive',
			});
			expect(mockResponse.flushHeaders).toHaveBeenCalled();

			// Verify response structure for streaming
			expect(result).toEqual({
				workflowData: expect.any(Array),
				noWebhookResponse: true,
			});
		});

		it('should enable streaming when availableInChat is true and responseMode is "streaming"', async () => {
			// Mock options with availableInChat true and streaming responseMode
			mockContext.getNodeParameter.mockImplementation(
				(
					paramName: string,
					defaultValue?: boolean | string | object,
				): boolean | string | object | undefined => {
					if (paramName === 'public') return true;
					if (paramName === 'mode') return 'hostedChat';
					if (paramName === 'options') return { responseMode: 'streaming' };
					if (paramName === 'availableInChat') return true;
					return defaultValue;
				},
			);

			// Call the webhook method
			const result = await chatTrigger.webhook(mockContext);

			// Verify streaming headers are set
			expect(mockResponse.writeHead).toHaveBeenCalledWith(200, {
				'Content-Type': 'application/json; charset=utf-8',
				'Transfer-Encoding': 'chunked',
				'Cache-Control': 'no-cache, no-transform',
				Connection: 'keep-alive',
			});
			expect(mockResponse.flushHeaders).toHaveBeenCalled();

			// Verify response structure for streaming
			expect(result).toEqual({
				workflowData: expect.any(Array),
				noWebhookResponse: true,
			});
		});

		it('should handle multipart form data with streaming enabled', async () => {
			// Mock multipart form data request
			mockRequest.contentType = 'multipart/form-data';
			mockRequest.body = {
				data: { message: 'Hello' },
				files: {},
			};

			// Mock options with streaming responseMode
			mockContext.getNodeParameter.mockImplementation(
				(
					paramName: string,
					defaultValue?: boolean | string | object,
				): boolean | string | object | undefined => {
					if (paramName === 'public') return true;
					if (paramName === 'mode') return 'hostedChat';
					if (paramName === 'options') return { responseMode: 'streaming' };
					return defaultValue;
				},
			);

			// Call the webhook method
			const result = await chatTrigger.webhook(mockContext);

			// Verify streaming headers are set
			expect(mockResponse.writeHead).toHaveBeenCalledWith(200, {
				'Content-Type': 'application/json; charset=utf-8',
				'Transfer-Encoding': 'chunked',
				'Cache-Control': 'no-cache, no-transform',
				Connection: 'keep-alive',
			});
			expect(mockResponse.flushHeaders).toHaveBeenCalled();

			// Verify response structure for streaming
			expect(result).toEqual({
				workflowData: expect.any(Array),
				noWebhookResponse: true,
			});
		});
	});
});
