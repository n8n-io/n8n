import { mock } from 'jest-mock-extended';
import type { IWebhookFunctions, INodeType } from 'n8n-workflow';

import { CustomerIoTrigger } from '../CustomerIoTrigger.node';

jest.mock('../CustomerIoTriggerHelpers', () => ({
	verifySignature: jest.fn(),
}));

import { verifySignature } from '../CustomerIoTriggerHelpers';

describe('CustomerIoTrigger Node', () => {
	let customerIoTrigger: INodeType;
	let mockWebhookFunctions: ReturnType<typeof mock<IWebhookFunctions>>;

	const mockBody = {
		event_id: '01E4E0XXXXXXXXX',
		event_type: 'email_delivered',
	};

	beforeEach(() => {
		jest.clearAllMocks();
		customerIoTrigger = new CustomerIoTrigger();
		mockWebhookFunctions = mock<IWebhookFunctions>();

		mockWebhookFunctions.helpers = {
			returnJsonArray: jest.fn().mockImplementation((data) => [{ json: data }]),
		} as any;

		mockWebhookFunctions.getBodyData.mockReturnValue(mockBody);

		mockWebhookFunctions.getResponseObject.mockReturnValue({
			status: jest.fn().mockReturnThis(),
			send: jest.fn().mockReturnThis(),
			end: jest.fn(),
		} as any);
	});

	describe('webhook method', () => {
		it('should trigger workflow when signature is valid', async () => {
			(verifySignature as jest.Mock).mockResolvedValue(true);

			const result = await customerIoTrigger.webhook!.call(mockWebhookFunctions);

			expect(result.workflowData).toBeDefined();
			expect(result.workflowData![0][0].json).toEqual(mockBody);
		});

		it('should respond with 401 when signature is invalid', async () => {
			(verifySignature as jest.Mock).mockResolvedValue(false);

			const mockResponse = {
				status: jest.fn().mockReturnThis(),
				send: jest.fn().mockReturnThis(),
				end: jest.fn(),
			};
			mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse as any);

			const result = await customerIoTrigger.webhook!.call(mockWebhookFunctions);

			expect(result).toEqual({ noWebhookResponse: true });
			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.send).toHaveBeenCalledWith('Unauthorized');
			expect(mockResponse.end).toHaveBeenCalled();
		});
	});
});
