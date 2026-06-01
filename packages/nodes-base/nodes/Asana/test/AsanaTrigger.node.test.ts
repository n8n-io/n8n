import type { IWebhookFunctions } from 'n8n-workflow';

import { AsanaTrigger } from '../AsanaTrigger.node';
import { verifySignature } from '../AsanaTriggerHelpers';

jest.mock('../AsanaTriggerHelpers');
jest.mock('../GenericFunctions');

describe('AsanaTrigger', () => {
	let trigger: AsanaTrigger;
	let mockWebhookFunctions: Pick<
		jest.Mocked<IWebhookFunctions>,
		| 'getBodyData'
		| 'getHeaderData'
		| 'getRequestObject'
		| 'getResponseObject'
		| 'getWorkflowStaticData'
		| 'helpers'
	>;

	beforeEach(() => {
		jest.clearAllMocks();
		trigger = new AsanaTrigger();

		mockWebhookFunctions = {
			getBodyData: jest.fn(),
			getHeaderData: jest.fn(),
			getRequestObject: jest.fn(),
			getResponseObject: jest.fn(),
			getWorkflowStaticData: jest.fn(),
			helpers: {
				returnJsonArray: jest.fn((data) => data),
			} as any,
		};
	});

	describe('webhook', () => {
		it('should complete the handshake when X-Hook-Secret header is present', async () => {
			const handshakeSecret = 'asana-handshake-secret';
			const mockResponse = {
				set: jest.fn().mockReturnThis(),
				status: jest.fn().mockReturnThis(),
				end: jest.fn(),
			};
			const webhookData: any = {};

			mockWebhookFunctions.getBodyData.mockReturnValue({});
			mockWebhookFunctions.getHeaderData.mockReturnValue({
				'x-hook-secret': handshakeSecret,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({} as any);
			mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse as any);
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(webhookData);

			const result = await trigger.webhook.call(
				mockWebhookFunctions as unknown as IWebhookFunctions,
			);

			expect(webhookData.hookSecret).toBe(handshakeSecret);
			expect(mockResponse.set).toHaveBeenCalledWith('X-Hook-Secret', handshakeSecret);
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(verifySignature).not.toHaveBeenCalled();
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('should return 401 when signature verification fails', async () => {
			const mockResponse = {
				status: jest.fn().mockReturnThis(),
				send: jest.fn().mockReturnThis(),
				end: jest.fn(),
			};

			(verifySignature as jest.Mock).mockReturnValue(false);
			mockWebhookFunctions.getBodyData.mockReturnValue({});
			mockWebhookFunctions.getHeaderData.mockReturnValue({});
			mockWebhookFunctions.getRequestObject.mockReturnValue({} as any);
			mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse as any);
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({});

			const result = await trigger.webhook.call(
				mockWebhookFunctions as unknown as IWebhookFunctions,
			);

			expect(verifySignature).toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.send).toHaveBeenCalledWith('Unauthorized');
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('should process events when signature verification passes', async () => {
			const events = [{ action: 'changed', resource: { gid: '1' } }];

			(verifySignature as jest.Mock).mockReturnValue(true);
			mockWebhookFunctions.getBodyData.mockReturnValue({ events });
			mockWebhookFunctions.getHeaderData.mockReturnValue({});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				body: { events },
			} as any);
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
				hookSecret: 'secret',
			});

			const result = await trigger.webhook.call(
				mockWebhookFunctions as unknown as IWebhookFunctions,
			);

			expect(verifySignature).toHaveBeenCalled();
			expect(result.workflowData).toBeDefined();
			expect(result.workflowData?.[0]).toEqual(events);
		});

		it('should process events when no secret is configured (backward compatibility)', async () => {
			const events = [{ action: 'added' }];

			(verifySignature as jest.Mock).mockReturnValue(true);
			mockWebhookFunctions.getBodyData.mockReturnValue({ events });
			mockWebhookFunctions.getHeaderData.mockReturnValue({});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				body: { events },
			} as any);
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({});

			const result = await trigger.webhook.call(
				mockWebhookFunctions as unknown as IWebhookFunctions,
			);

			expect(verifySignature).toHaveBeenCalled();
			expect(result.workflowData).toBeDefined();
			expect(result.workflowData?.[0]).toEqual(events);
		});

		it('should return empty result when events array is empty after verification', async () => {
			(verifySignature as jest.Mock).mockReturnValue(true);
			mockWebhookFunctions.getBodyData.mockReturnValue({ events: [] });
			mockWebhookFunctions.getHeaderData.mockReturnValue({});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				body: { events: [] },
			} as any);
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({});

			const result = await trigger.webhook.call(
				mockWebhookFunctions as unknown as IWebhookFunctions,
			);

			expect(verifySignature).toHaveBeenCalled();
			expect(result).toEqual({});
		});
	});
});
