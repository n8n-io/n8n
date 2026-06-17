import type { IWebhookFunctions } from 'n8n-workflow';

import { AsanaTrigger } from '../AsanaTrigger.node';
import { verifySignature } from '../AsanaTriggerHelpers';
import type { Mock, Mocked } from 'vitest';

vi.mock('../AsanaTriggerHelpers');
vi.mock('../GenericFunctions');

describe('AsanaTrigger', () => {
	let trigger: AsanaTrigger;
	let mockWebhookFunctions: Pick<
		Mocked<IWebhookFunctions>,
		| 'getBodyData'
		| 'getHeaderData'
		| 'getRequestObject'
		| 'getResponseObject'
		| 'getWorkflowStaticData'
		| 'helpers'
	>;

	beforeEach(() => {
		vi.clearAllMocks();
		trigger = new AsanaTrigger();

		mockWebhookFunctions = {
			getBodyData: vi.fn(),
			getHeaderData: vi.fn(),
			getRequestObject: vi.fn(),
			getResponseObject: vi.fn(),
			getWorkflowStaticData: vi.fn(),
			helpers: {
				returnJsonArray: vi.fn((data) => data),
			} as any,
		};
	});

	describe('webhook', () => {
		it('should complete the handshake when X-Hook-Secret header is present', async () => {
			const handshakeSecret = 'asana-handshake-secret';
			const mockResponse = {
				set: vi.fn().mockReturnThis(),
				status: vi.fn().mockReturnThis(),
				end: vi.fn(),
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
				status: vi.fn().mockReturnThis(),
				send: vi.fn().mockReturnThis(),
				end: vi.fn(),
			};

			(verifySignature as Mock).mockReturnValue(false);
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

			(verifySignature as Mock).mockReturnValue(true);
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

			(verifySignature as Mock).mockReturnValue(true);
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
			(verifySignature as Mock).mockReturnValue(true);
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
