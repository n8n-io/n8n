import { jest } from '@jest/globals';
import type { Request, Response } from 'express';
import { mock } from 'jest-mock-extended';
import type { IWebhookFunctions } from 'n8n-workflow';

import { ChatTrigger } from '../ChatTrigger.node';
import type { LoadPreviousSessionChatOption } from '../types';

jest.mock('../GenericFunctions', () => ({
	validateAuth: jest.fn(),
}));

describe('ChatTrigger Node', () => {
	const mockContext = mock<IWebhookFunctions>();
	const mockRequest = mock<Request>();
	const mockResponse = mock<Response>();
	let chatTrigger: ChatTrigger;

	beforeEach(() => {
		jest.clearAllMocks();

		chatTrigger = new ChatTrigger();

		mockContext.getRequestObject.mockReturnValue(mockRequest);
		mockContext.getResponseObject.mockReturnValue(mockResponse);
		mockContext.getNodeParameter.mockImplementation(
			(
				paramName: string,
				defaultValue?: boolean | string | object,
			): boolean | string | object | undefined => {
				if (paramName === 'public') return true;
				if (paramName === 'mode') return 'hostedChat';
				if (paramName === 'options') return {};
				return defaultValue;
			},
		);
		mockContext.getBodyData.mockReturnValue({});
	});

	describe('webhook method: loadPreviousSession action', () => {
		beforeEach(() => {
			mockContext.getBodyData.mockReturnValue({ action: 'loadPreviousSession' });
		});

		it('should return empty array when loadPreviousSession is undefined', async () => {
			// Mock options with undefined loadPreviousSession
			mockContext.getNodeParameter.mockImplementation(
				(
					paramName: string,
					defaultValue?: boolean | string | object,
				): boolean | string | object | undefined => {
					if (paramName === 'public') return true;
					if (paramName === 'mode') return 'hostedChat';
					if (paramName === 'options') return { loadPreviousSession: undefined };
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
			// Mock chat history data
			const mockMessages = [
				{ toJSON: () => ({ content: 'Message 1' }) },
				{ toJSON: () => ({ content: 'Message 2' }) },
			];

			// Mock memory with chat history
			const mockMemory = {
				chatHistory: {
					getMessages: jest.fn().mockReturnValueOnce(mockMessages),
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
		});
	});

	describe('webhook method: streaming response mode', () => {
		beforeEach(() => {
			mockContext.getWebhookName.mockReturnValue('default');
			mockContext.getMode.mockReturnValue('production' as any);
			mockContext.getBodyData.mockReturnValue({ message: 'Hello' });
			(mockContext.helpers.returnJsonArray as any) = jest.fn().mockReturnValue([]);
			mockResponse.writeHead.mockImplementation(() => mockResponse);
			mockResponse.flushHeaders.mockImplementation(() => undefined);
		});

		it('should enable streaming when responseMode is "streaming"', async () => {
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
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
			});
			expect(mockResponse.flushHeaders).toHaveBeenCalled();

			// Verify response structure for streaming
			expect(result).toEqual({
				workflowData: expect.any(Array),
				noWebhookResponse: true,
			});
		});

		it('should not enable streaming when responseMode is not "streaming"', async () => {
			// Mock options with lastNode responseMode
			mockContext.getNodeParameter.mockImplementation(
				(
					paramName: string,
					defaultValue?: boolean | string | object,
				): boolean | string | object | undefined => {
					if (paramName === 'public') return true;
					if (paramName === 'mode') return 'hostedChat';
					if (paramName === 'options') return { responseMode: 'lastNode' };
					return defaultValue;
				},
			);

			// Call the webhook method
			const result = await chatTrigger.webhook(mockContext);

			// Verify streaming headers are NOT set
			expect(mockResponse.writeHead).not.toHaveBeenCalled();
			expect(mockResponse.flushHeaders).not.toHaveBeenCalled();

			// Verify normal response structure
			expect(result).toEqual({
				webhookResponse: { status: 200 },
				workflowData: expect.any(Array),
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
				'Cache-Control': 'no-cache',
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
