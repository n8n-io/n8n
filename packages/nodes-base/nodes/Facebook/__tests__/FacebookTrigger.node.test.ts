import type { Response } from 'express';
import { mock } from 'jest-mock-extended';
import type { IDataObject, IWebhookFunctions } from 'n8n-workflow';

import { FacebookTrigger } from '../FacebookTrigger.node';

describe('FacebookTrigger', () => {
	let node: FacebookTrigger;
	let mockWebhookFunctions: jest.Mocked<IWebhookFunctions>;

	beforeEach(() => {
		node = new FacebookTrigger();
		mockWebhookFunctions = mock<IWebhookFunctions>();
		jest.clearAllMocks();
	});

	describe('webhook', () => {
		const createMockResponse = () =>
			({
				status: jest.fn().mockReturnThis(),
				type: jest.fn().mockReturnThis(),
				send: jest.fn().mockReturnThis(),
				end: jest.fn(),
			}) as unknown as Response;

		it('should respond to verification challenge as text/plain when the verify token matches', async () => {
			const mockResponse = createMockResponse();

			mockWebhookFunctions.getNode.mockReturnValue({ id: 'test-token' } as any);
			mockWebhookFunctions.getWebhookName.mockReturnValue('setup');
			mockWebhookFunctions.getQueryData.mockReturnValue({
				'hub.challenge': 'test-challenge',
				'hub.verify_token': 'test-token',
			} as IDataObject);
			mockWebhookFunctions.getBodyData.mockReturnValue({});
			mockWebhookFunctions.getHeaderData.mockReturnValue({});
			mockWebhookFunctions.getRequestObject.mockReturnValue({ rawBody: Buffer.from('') } as any);
			mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse);
			mockWebhookFunctions.getNodeParameter.mockReturnValue('accessToken');
			mockWebhookFunctions.getCredentials.mockResolvedValue({ appSecret: '' });

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.type).toHaveBeenCalledWith('text/plain');
			expect(mockResponse.send).toHaveBeenCalledWith('test-challenge');
			expect(mockResponse.end).toHaveBeenCalled();
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('should reject the verification challenge when the verify token does not match', async () => {
			const mockResponse = createMockResponse();

			mockWebhookFunctions.getNode.mockReturnValue({ id: 'expected-token' } as any);
			mockWebhookFunctions.getWebhookName.mockReturnValue('setup');
			mockWebhookFunctions.getQueryData.mockReturnValue({
				'hub.challenge': 'test-challenge',
				'hub.verify_token': 'attacker-supplied-token',
			} as IDataObject);
			mockWebhookFunctions.getBodyData.mockReturnValue({});
			mockWebhookFunctions.getHeaderData.mockReturnValue({});
			mockWebhookFunctions.getRequestObject.mockReturnValue({ rawBody: Buffer.from('') } as any);
			mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse);
			mockWebhookFunctions.getNodeParameter.mockReturnValue('accessToken');
			mockWebhookFunctions.getCredentials.mockResolvedValue({ appSecret: '' });

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(mockResponse.send).not.toHaveBeenCalled();
			expect(mockResponse.status).not.toHaveBeenCalled();
			expect(result).toEqual({});
		});
	});
});
