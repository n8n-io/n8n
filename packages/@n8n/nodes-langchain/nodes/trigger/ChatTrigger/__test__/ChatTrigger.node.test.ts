import { ChatTriggerConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { jest } from '@jest/globals';
import type { Request, Response } from 'express';
import { mock } from 'jest-mock-extended';
import type { INode, IWebhookFunctions } from 'n8n-workflow';

import { ChatTrigger } from '../ChatTrigger.node';

jest.mock('../GenericFunctions', () => ({
	validateAuth: jest.fn().mockResolvedValue(undefined),
}));

describe('ChatTrigger Node', () => {
	const mockContext = mock<IWebhookFunctions>();
	const mockRequest = mock<Request>();
	const mockResponse = mock<Response>();
	let chatTrigger: ChatTrigger;
	let chatTriggerConfig: ChatTriggerConfig;

	beforeEach(() => {
		jest.clearAllMocks();

		chatTrigger = new ChatTrigger();
		chatTriggerConfig = new ChatTriggerConfig();
		Container.set(ChatTriggerConfig, chatTriggerConfig);

		mockResponse.status.mockReturnValue(mockResponse);
		mockResponse.send.mockReturnValue(mockResponse);
		mockResponse.end.mockReturnValue(mockResponse);
		mockResponse.writeHead.mockReturnValue(mockResponse);
		mockResponse.flushHeaders.mockImplementation(() => mockResponse);

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
			returnJsonArray: jest.fn().mockReturnValue([]),
		} as IWebhookFunctions['helpers'];
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
	});
});
