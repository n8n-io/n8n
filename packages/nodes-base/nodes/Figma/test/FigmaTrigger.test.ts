import type { IDataObject, IWebhookFunctions } from 'n8n-workflow';

import { FigmaTrigger } from '../FigmaTrigger.node';
import { verifySignature } from '../FigmaTriggerHelpers';

jest.mock('../FigmaTriggerHelpers', () => ({
	verifySignature: jest.fn(),
}));

describe('FigmaTrigger', () => {
	let trigger: FigmaTrigger;
	let mockWebhookFunctions: Partial<IWebhookFunctions>;
	let mockResponse: { status: jest.Mock; send: jest.Mock; end: jest.Mock };

	beforeEach(() => {
		trigger = new FigmaTrigger();
		mockResponse = {
			status: jest.fn().mockReturnThis(),
			send: jest.fn().mockReturnThis(),
			end: jest.fn().mockReturnThis(),
		};

		mockWebhookFunctions = {
			getBodyData: jest.fn(),
			getResponseObject: jest.fn().mockReturnValue(mockResponse),
			helpers: {
				returnJsonArray: jest.fn((data) => data),
			} as unknown as IWebhookFunctions['helpers'],
		};

		(verifySignature as jest.Mock).mockReturnValue(true);
	});

	describe('webhook', () => {
		it('should return 401 when verification fails', async () => {
			(verifySignature as jest.Mock).mockReturnValue(false);

			const result = await trigger.webhook.call(mockWebhookFunctions as IWebhookFunctions);

			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.send).toHaveBeenCalledWith('Unauthorized');
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('should respond 200 to PING events without triggering workflow', async () => {
			const bodyData: IDataObject = {
				event_type: 'PING',
				passcode: 'test-passcode',
				timestamp: '2020-02-23T20:27:16Z',
				webhook_id: '22',
			};

			(mockWebhookFunctions.getBodyData as jest.Mock).mockReturnValue(bodyData);

			const result = await trigger.webhook.call(mockWebhookFunctions as IWebhookFunctions);

			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('should trigger workflow when verification passes', async () => {
			const bodyData: IDataObject = {
				event_type: 'FILE_UPDATE',
				file_key: 'fake-file-key-1',
				file_name: 'Test file',
				passcode: 'test-passcode',
				timestamp: '2020-02-23T20:27:16Z',
				webhook_id: '22',
			};

			(mockWebhookFunctions.getBodyData as jest.Mock).mockReturnValue(bodyData);

			const result = await trigger.webhook.call(mockWebhookFunctions as IWebhookFunctions);

			expect(result.workflowData).toBeDefined();
			expect(mockWebhookFunctions.helpers!.returnJsonArray).toHaveBeenCalledWith(bodyData);
		});

		it('should trigger workflow when no secret is configured (backward compatibility)', async () => {
			(verifySignature as jest.Mock).mockReturnValue(true);

			const bodyData: IDataObject = {
				event_type: 'FILE_COMMENT',
				file_key: 'fake-file-key-2',
				file_name: 'Test file',
				webhook_id: '22',
			};

			(mockWebhookFunctions.getBodyData as jest.Mock).mockReturnValue(bodyData);

			const result = await trigger.webhook.call(mockWebhookFunctions as IWebhookFunctions);

			expect(result.workflowData).toBeDefined();
		});
	});

	describe('description', () => {
		it('should have correct node metadata', () => {
			expect(trigger.description.displayName).toBe('Figma Trigger (Beta)');
			expect(trigger.description.name).toBe('figmaTrigger');
			expect(trigger.description.group).toContain('trigger');
		});
	});
});
