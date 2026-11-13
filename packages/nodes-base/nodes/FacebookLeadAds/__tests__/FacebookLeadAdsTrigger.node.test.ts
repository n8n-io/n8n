import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';
import type {
	IDataObject,
	IHookFunctions,
	ILoadOptionsFunctions,
	INode,
	IWebhookFunctions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

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

	describe('request URLs', () => {
		const request = vi.fn();
		const requestOAuth2 = vi.fn();
		const credentials = {
			clientId: '1234567890123456',
			clientSecret: 'secret',
			accessTokenUrl: 'https://graph.facebook.com/v17.0/oauth/access_token',
		};
		let parameters: IDataObject;

		const createContext = <T extends IHookFunctions | ILoadOptionsFunctions>() => {
			const context = mock<IHookFunctions & ILoadOptionsFunctions>({
				helpers: mock<IHookFunctions['helpers']>({ request, requestOAuth2 }),
			});
			context.getNode.mockReturnValue(mock<INode>({ id: 'node-id' }));
			context.getNodeWebhookUrl.mockReturnValue('https://n8n.example.com/webhook/fb');
			context.getCredentials.mockResolvedValue(credentials);
			context.getNodeParameter.mockImplementation((name: string) => parameters[name] as never);
			return context as unknown as T;
		};

		const requestUris = () => request.mock.calls.map(([options]) => String(options.uri));
		const oauthUris = () => requestOAuth2.mock.calls.map(([, options]) => String(options.uri));

		beforeEach(() => {
			parameters = { page: '109876543210987', form: '556677889900112' };
			request.mockReset();
			requestOAuth2.mockReset();
		});

		it('should send checkExists to the app subscriptions URL', async () => {
			request
				.mockResolvedValueOnce({ access_token: 'app-token' })
				.mockResolvedValueOnce({ data: [] });

			await node.webhookMethods.default.checkExists.call(createContext<IHookFunctions>());

			expect(requestUris()).toEqual([
				'https://graph.facebook.com/v17.0/oauth/access_token',
				'https://graph.facebook.com/v21.0/1234567890123456/subscriptions',
			]);
		});

		it('should throw an API error for an access token URL with a query', async () => {
			const context = createContext<IHookFunctions>();
			vi.mocked(context.getCredentials).mockResolvedValue({
				...credentials,
				accessTokenUrl: 'https://graph.facebook.com/v17.0/oauth/access_token?x=1',
			});

			await expect(node.webhookMethods.default.checkExists.call(context)).rejects.toThrow(
				NodeApiError,
			);
			expect(request).not.toHaveBeenCalled();
		});

		it('should send create to the app subscriptions and page subscribed apps URLs', async () => {
			request
				.mockResolvedValueOnce({ access_token: 'app-token' })
				.mockResolvedValueOnce({ success: true })
				.mockResolvedValueOnce({ success: true });
			requestOAuth2.mockResolvedValue({ id: '109876543210987', access_token: 'page-token' });

			await node.webhookMethods.default.create.call(createContext<IHookFunctions>());

			expect(requestUris()).toEqual([
				'https://graph.facebook.com/v17.0/oauth/access_token',
				'https://graph.facebook.com/v21.0/1234567890123456/subscriptions',
				'https://graph.facebook.com/v21.0/109876543210987/subscribed_apps',
			]);
			expect(oauthUris()).toEqual(['https://graph.facebook.com/v21.0/109876543210987']);
		});

		it('should send delete to the app subscriptions URL', async () => {
			request
				.mockResolvedValueOnce({ access_token: 'app-token' })
				.mockResolvedValueOnce({ success: true });

			await node.webhookMethods.default.delete.call(createContext<IHookFunctions>());

			expect(requestUris()).toEqual([
				'https://graph.facebook.com/v17.0/oauth/access_token',
				'https://graph.facebook.com/v21.0/1234567890123456/subscriptions',
			]);
		});

		it('should list pages from the accounts URL', async () => {
			requestOAuth2.mockResolvedValue({ data: [] });

			await node.methods.listSearch.pageList.call(createContext<ILoadOptionsFunctions>());

			expect(oauthUris()).toEqual(['https://graph.facebook.com/v21.0/me/accounts']);
		});

		it('should list forms from the page leadgen forms URL', async () => {
			requestOAuth2.mockResolvedValue({ id: '109876543210987', access_token: 'page-token' });
			request.mockResolvedValue({ data: [] });

			await node.methods.listSearch.formList.call(createContext<ILoadOptionsFunctions>());

			expect(oauthUris()).toEqual(['https://graph.facebook.com/v21.0/109876543210987']);
			expect(requestUris()).toEqual([
				'https://graph.facebook.com/v21.0/109876543210987/leadgen_forms',
			]);
		});

		it('should encode a page ID that contains a slash', async () => {
			parameters.page = '109876543210987/feed';
			requestOAuth2.mockResolvedValue({ id: '109876543210987', access_token: 'page-token' });
			request.mockResolvedValue({ data: [] });

			await node.methods.listSearch.formList.call(createContext<ILoadOptionsFunctions>());

			expect(oauthUris()).toEqual(['https://graph.facebook.com/v21.0/109876543210987%2Ffeed']);
			expect(requestUris()).toEqual([
				'https://graph.facebook.com/v21.0/109876543210987%2Ffeed/leadgen_forms',
			]);
		});
	});
});
