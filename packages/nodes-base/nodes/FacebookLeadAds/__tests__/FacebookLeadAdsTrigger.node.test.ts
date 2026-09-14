import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';
import type { IDataObject, INode, IWebhookFunctions } from 'n8n-workflow';

import { FacebookLeadAdsTrigger } from '../FacebookLeadAdsTrigger.node';
import type { Mocked } from 'vitest';

describe('FacebookLeadAdsTrigger', () => {
	let node: FacebookLeadAdsTrigger;
	let mockWebhookFunctions: Mocked<IWebhookFunctions>;

	beforeEach(() => {
		node = new FacebookLeadAdsTrigger();
		mockWebhookFunctions = mock<IWebhookFunctions>();
		vi.clearAllMocks();
	});

	describe('webhook', () => {
		it('should respond to verification challenge as text/plain', async () => {
			const mockResponse = {
				status: vi.fn().mockReturnThis(),
				type: vi.fn().mockReturnThis(),
				send: vi.fn().mockReturnThis(),
				end: vi.fn(),
			} as unknown as Response;

			mockWebhookFunctions.getWebhookName.mockReturnValue('setup');
			mockWebhookFunctions.getQueryData.mockReturnValue({
				'hub.challenge': 'test-challenge',
				'hub.verify_token': 'test-node-id',
			} as IDataObject);
			mockWebhookFunctions.getBodyData.mockReturnValue({});
			mockWebhookFunctions.getHeaderData.mockReturnValue({});
			mockWebhookFunctions.getRequestObject.mockReturnValue({ rawBody: Buffer.from('') } as any);
			mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse);
			mockWebhookFunctions.getCredentials.mockResolvedValue({ clientSecret: 'secret' });
			mockWebhookFunctions.getNodeParameter.mockReturnValue('');
			mockWebhookFunctions.getNode.mockReturnValue(mock<INode>({ id: 'test-node-id' }));

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.type).toHaveBeenCalledWith('text/plain');
			expect(mockResponse.send).toHaveBeenCalledWith('test-challenge');
			expect(mockResponse.end).toHaveBeenCalled();
			expect(result).toEqual({ noWebhookResponse: true });
		});
	});
});
