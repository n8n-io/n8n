import { mock } from 'vitest-mock-extended';
import type { IWebhookFunctions, INodeType } from 'n8n-workflow';

import { CustomerIoTrigger } from '../CustomerIoTrigger.node';

vi.mock('../CustomerIoTriggerHelpers', () => ({
	verifySignature: vi.fn(),
}));

import { verifySignature } from '../CustomerIoTriggerHelpers';
import type { Mock } from 'vitest';

describe('CustomerIoTrigger Node', () => {
	let customerIoTrigger: INodeType;
	let mockWebhookFunctions: ReturnType<typeof mock<IWebhookFunctions>>;

	const mockBody = {
		event_id: '01E4E0XXXXXXXXX',
		event_type: 'email_delivered',
	};

	beforeEach(() => {
		vi.clearAllMocks();
		customerIoTrigger = new CustomerIoTrigger();
		mockWebhookFunctions = mock<IWebhookFunctions>();

		mockWebhookFunctions.helpers = {
			returnJsonArray: vi.fn().mockImplementation((data) => [{ json: data }]),
		} as any;

		mockWebhookFunctions.getBodyData.mockReturnValue(mockBody);

		mockWebhookFunctions.getResponseObject.mockReturnValue({
			status: vi.fn().mockReturnThis(),
			send: vi.fn().mockReturnThis(),
			end: vi.fn(),
		} as any);
	});

	describe('webhook method', () => {
		it('should trigger workflow when signature is valid', async () => {
			(verifySignature as Mock).mockResolvedValue(true);

			const result = await customerIoTrigger.webhook!.call(mockWebhookFunctions);

			expect(result.workflowData).toBeDefined();
			expect(result.workflowData![0][0].json).toEqual(mockBody);
		});

		it('should respond with 401 when signature is invalid', async () => {
			(verifySignature as Mock).mockResolvedValue(false);

			const mockResponse = {
				status: vi.fn().mockReturnThis(),
				send: vi.fn().mockReturnThis(),
				end: vi.fn(),
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
