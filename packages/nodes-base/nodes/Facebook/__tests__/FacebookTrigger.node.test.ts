import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';
import type { IDataObject, IHookFunctions, INode, IWebhookFunctions } from 'n8n-workflow';

import { FacebookTrigger } from '../FacebookTrigger.node';
import type { Mocked } from 'vitest';

describe('FacebookTrigger', () => {
	let node: FacebookTrigger;
	let mockWebhookFunctions: Mocked<IWebhookFunctions>;

	beforeEach(() => {
		node = new FacebookTrigger();
		mockWebhookFunctions = mock<IWebhookFunctions>();
		vi.clearAllMocks();
	});

	describe('webhook', () => {
		const createMockResponse = () =>
			({
				status: vi.fn().mockReturnThis(),
				type: vi.fn().mockReturnThis(),
				send: vi.fn().mockReturnThis(),
				end: vi.fn(),
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

	describe('webhookMethods', () => {
		let mockHookFunctions: Mocked<IHookFunctions>;
		const request = vi.fn();

		beforeEach(() => {
			mockHookFunctions = mock<IHookFunctions>({
				helpers: mock<IHookFunctions['helpers']>({ request }),
			});
			mockHookFunctions.getNode.mockReturnValue(
				mock<INode>({ id: 'node-id', name: 'Facebook Trigger' }),
			);
			mockHookFunctions.getNodeWebhookUrl.mockReturnValue('https://n8n.example.com/webhook/fb');
			mockHookFunctions.getNodeParameter.mockImplementation(((name: string) => {
				const parameters: IDataObject = {
					authType: 'accessToken',
					appId: '1234567890123456',
					object: 'page',
					fields: ['feed'],
					options: {},
				};
				return parameters[name];
			}) as unknown as IHookFunctions['getNodeParameter']);
			mockHookFunctions.getCredentials.mockResolvedValue({ accessToken: 'test-app-token' });
		});

		const requestUri = () => String(request.mock.calls[0][0].uri);

		it('should send checkExists to the app subscriptions URL', async () => {
			request.mockResolvedValue({ data: [] });

			await node.webhookMethods.default.checkExists.call(mockHookFunctions);

			expect(requestUri()).toBe('https://graph.facebook.com/v23.0/1234567890123456/subscriptions');
		});

		it('should send create to the app subscriptions URL', async () => {
			request.mockResolvedValue({ success: true });

			await node.webhookMethods.default.create.call(mockHookFunctions);

			expect(requestUri()).toBe('https://graph.facebook.com/v23.0/1234567890123456/subscriptions');
		});

		it('should send delete to the app subscriptions URL', async () => {
			request.mockResolvedValue({ success: true });

			await node.webhookMethods.default.delete.call(mockHookFunctions);

			expect(requestUri()).toBe('https://graph.facebook.com/v23.0/1234567890123456/subscriptions');
		});
	});
});
