import type { IHookFunctions, IWebhookFunctions } from 'n8n-workflow';

import { AsanaTrigger } from '../AsanaTrigger.node';
import { verifySignature } from '../AsanaTriggerHelpers';
import { asanaApiRequest } from '../GenericFunctions';
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
		it('should acknowledge the confirmation handshake by echoing the X-Hook-Secret header', async () => {
			const handshakeSecret = 'asana-handshake-secret';
			const mockResponse = {
				set: vi.fn().mockReturnThis(),
				status: vi.fn().mockReturnThis(),
				end: vi.fn(),
			};

			mockWebhookFunctions.getBodyData.mockReturnValue({});
			mockWebhookFunctions.getHeaderData.mockReturnValue({
				'x-hook-secret': handshakeSecret,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({} as any);
			mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse as any);

			const result = await trigger.webhook.call(
				mockWebhookFunctions as unknown as IWebhookFunctions,
			);

			expect(mockResponse.set).toHaveBeenCalledWith('X-Hook-Secret', handshakeSecret);
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(verifySignature).not.toHaveBeenCalled();
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('should not store a secret from the handshake header, even when one is already set', async () => {
			const establishedSecret = 'secret-captured-from-the-create-response';
			const mockResponse = {
				set: vi.fn().mockReturnThis(),
				status: vi.fn().mockReturnThis(),
				end: vi.fn(),
			};
			const webhookData: any = { hookSecret: establishedSecret };

			mockWebhookFunctions.getBodyData.mockReturnValue({});
			mockWebhookFunctions.getHeaderData.mockReturnValue({
				'x-hook-secret': 'some-other-value',
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({} as any);
			mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse as any);
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(webhookData);

			await trigger.webhook.call(mockWebhookFunctions as unknown as IWebhookFunctions);

			expect(webhookData.hookSecret).toBe(establishedSecret);
			expect(mockWebhookFunctions.getWorkflowStaticData).not.toHaveBeenCalled();
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

	describe('webhookMethods.default.create', () => {
		let mockHookFunctions: Pick<
			Mocked<IHookFunctions>,
			'getWorkflowStaticData' | 'getNodeWebhookUrl' | 'getNodeParameter'
		>;

		beforeEach(() => {
			mockHookFunctions = {
				getWorkflowStaticData: vi.fn(),
				getNodeWebhookUrl: vi.fn().mockReturnValue('https://example.com/webhook'),
				getNodeParameter: vi.fn().mockReturnValue('resource-gid'),
			};
		});

		it('should capture the webhook id and verification secret from the create response', async () => {
			const webhookData: any = {};
			mockHookFunctions.getWorkflowStaticData.mockReturnValue(webhookData);
			(asanaApiRequest as Mock).mockResolvedValue({
				data: { gid: 'webhook-gid' },
				'X-Hook-Secret': 'the-real-secret',
			});

			const result = await trigger.webhookMethods.default.create.call(
				mockHookFunctions as unknown as IHookFunctions,
			);

			expect(result).toBe(true);
			expect(webhookData.webhookId).toBe('webhook-gid');
			expect(webhookData.hookSecret).toBe('the-real-secret');
		});

		it('should not set a secret when the create response omits X-Hook-Secret', async () => {
			const webhookData: any = {};
			mockHookFunctions.getWorkflowStaticData.mockReturnValue(webhookData);
			(asanaApiRequest as Mock).mockResolvedValue({
				data: { gid: 'webhook-gid' },
			});

			const result = await trigger.webhookMethods.default.create.call(
				mockHookFunctions as unknown as IHookFunctions,
			);

			expect(result).toBe(true);
			expect(webhookData.webhookId).toBe('webhook-gid');
			expect(webhookData.hookSecret).toBeUndefined();
		});
	});
});
