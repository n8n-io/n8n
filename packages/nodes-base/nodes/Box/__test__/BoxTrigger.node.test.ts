import { mock } from 'jest-mock-extended';
import type { IHookFunctions } from 'n8n-workflow';
import { BoxTrigger } from '../BoxTrigger.node';

describe('Box Trigger Webhook Lifecycle', () => {
	const mockHookFunctions = mock<IHookFunctions>();
	const mockStaticData: Record<string, string> = {};
	const mockRequestOAuth2 = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		Object.keys(mockStaticData).forEach((key) => delete mockStaticData[key]);
		mockHookFunctions.getWorkflowStaticData.mockReturnValue(mockStaticData);
		mockHookFunctions.getNodeWebhookUrl.mockReturnValue('https://n8n.io/webhook/box-test');

		// Mock getNodeParameter to return different values based on parameter name
		mockHookFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
			switch (parameterName) {
				case 'events':
					return ['FILE.UPLOADED'];
				case 'targetId':
					return '12345';
				case 'targetType':
					return 'file';
				default:
					return undefined;
			}
		});

		// Mock the OAuth2 request helper
		mockHookFunctions.helpers = {
			...mockHookFunctions.helpers,
			requestOAuth2: mockRequestOAuth2,
		};
	});

	describe('checkExists', () => {
		it('should not store webhook ID when no matching webhook exists', async () => {
			// Mock API response with no matching webhooks
			mockRequestOAuth2
				.mockResolvedValueOnce({
					entries: [
						{
							id: 'webhook_123',
							address: 'https://other-app.com/webhook',
							target: { id: '67890', type: 'file' },
							triggers: ['FILE.UPLOADED'],
						},
						{
							id: 'webhook_456',
							address: 'https://n8n.io/webhook/box-test',
							target: { id: '67890', type: 'file' }, // Different target ID
							triggers: ['FILE.UPLOADED'],
						},
					],
					offset: 0,
				})
				.mockResolvedValueOnce({
					entries: [], // Empty to terminate the loop
					offset: 100,
				});

			const boxTrigger = new BoxTrigger();
			const exists = await boxTrigger.webhookMethods.default.checkExists.call(mockHookFunctions);

			expect(exists).toBe(false);
			expect(mockStaticData.webhookId).toBeUndefined();
		});

		it('should store the correct webhook ID when a matching webhook exists', async () => {
			// Mock API response with a matching webhook
			// boxApiRequestAllItems expects a response with 'entries' property
			mockRequestOAuth2
				.mockResolvedValueOnce({
					entries: [
						{
							id: 'webhook_123',
							address: 'https://other-app.com/webhook',
							target: { id: '67890', type: 'file' },
							triggers: ['FILE.UPLOADED'],
						},
						{
							id: 'webhook_456',
							address: 'https://n8n.io/webhook/box-test',
							target: { id: '12345', type: 'file' }, // Matching target
							triggers: ['FILE.UPLOADED'],
						},
					],
					offset: 0,
				})
				.mockResolvedValueOnce({
					entries: [], // Empty to terminate the loop
					offset: 100,
				});

			const boxTrigger = new BoxTrigger();
			const exists = await boxTrigger.webhookMethods.default.checkExists.call(mockHookFunctions);

			expect(exists).toBe(true);
			expect(mockStaticData.webhookId).toBe('webhook_456');
		});

		it('should return false when webhook exists but triggers are missing', async () => {
			// Mock API response with matching webhook but missing triggers
			mockRequestOAuth2
				.mockResolvedValueOnce({
					entries: [
						{
							id: 'webhook_456',
							address: 'https://n8n.io/webhook/box-test',
							target: { id: '12345', type: 'file' },
							triggers: ['FILE.DOWNLOADED'], // Different trigger
						},
					],
					offset: 0,
				})
				.mockResolvedValueOnce({
					entries: [], // Empty to terminate the loop
					offset: 100,
				});

			const boxTrigger = new BoxTrigger();
			const exists = await boxTrigger.webhookMethods.default.checkExists.call(mockHookFunctions);

			expect(exists).toBe(false);
			expect(mockStaticData.webhookId).toBeUndefined();
		});

		it('should return false when webhook exists but target type is different', async () => {
			// Mock API response with matching webhook but different target type
			mockRequestOAuth2
				.mockResolvedValueOnce({
					entries: [
						{
							id: 'webhook_456',
							address: 'https://n8n.io/webhook/box-test',
							target: { id: '12345', type: 'folder' }, // Different target type
							triggers: ['FILE.UPLOADED'],
						},
					],
					offset: 0,
				})
				.mockResolvedValueOnce({
					entries: [], // Empty to terminate the loop
					offset: 100,
				});

			const boxTrigger = new BoxTrigger();
			const exists = await boxTrigger.webhookMethods.default.checkExists.call(mockHookFunctions);

			expect(exists).toBe(false);
			expect(mockStaticData.webhookId).toBeUndefined();
		});
	});

	describe('create', () => {
		it('should create a new webhook when none exists', async () => {
			mockRequestOAuth2.mockResolvedValue({
				id: 'webhook_new_789',
			});

			const boxTrigger = new BoxTrigger();
			const created = await boxTrigger.webhookMethods.default.create.call(mockHookFunctions);

			expect(created).toBe(true);
			expect(mockStaticData.webhookId).toBe('webhook_new_789');
			expect(mockHookFunctions.helpers.requestOAuth2).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					method: 'POST',
					uri: 'https://api.box.com/2.0/webhooks',
					body: {
						address: 'https://n8n.io/webhook/box-test',
						triggers: ['FILE.UPLOADED'],
						target: {
							id: '12345',
							type: 'file',
						},
					},
				}),
				expect.anything(),
			);
		});

		it('should return false when webhook creation fails', async () => {
			mockRequestOAuth2.mockResolvedValue({
				// No id in response
			});

			const boxTrigger = new BoxTrigger();
			const created = await boxTrigger.webhookMethods.default.create.call(mockHookFunctions);

			expect(created).toBe(false);
			expect(mockStaticData.webhookId).toBeUndefined();
		});
	});

	describe('delete', () => {
		it('should delete the correct webhook upon deactivation', async () => {
			mockStaticData.webhookId = 'webhook_456';
			mockRequestOAuth2.mockResolvedValue({});

			const boxTrigger = new BoxTrigger();
			const deleted = await boxTrigger.webhookMethods.default.delete.call(mockHookFunctions);

			expect(deleted).toBe(true);
			expect(mockHookFunctions.helpers.requestOAuth2).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					method: 'DELETE',
					uri: 'https://api.box.com/2.0/webhooks/webhook_456',
				}),
				expect.anything(),
			);
			expect(mockStaticData.webhookId).toBeUndefined();
		});

		it('should handle deletion when no webhook ID is stored', async () => {
			// No webhookId in static data
			mockRequestOAuth2.mockResolvedValue({});

			const boxTrigger = new BoxTrigger();
			const deleted = await boxTrigger.webhookMethods.default.delete.call(mockHookFunctions);

			expect(deleted).toBe(true);
			expect(mockHookFunctions.helpers.requestOAuth2).not.toHaveBeenCalled();
		});

		it('should handle delete API errors gracefully', async () => {
			mockStaticData.webhookId = 'webhook_456';
			mockRequestOAuth2.mockRejectedValue(new Error('API Error'));

			const boxTrigger = new BoxTrigger();
			const deleted = await boxTrigger.webhookMethods.default.delete.call(mockHookFunctions);

			expect(deleted).toBe(false);
			expect(mockStaticData.webhookId).toBe('webhook_456'); // Should not be deleted on error
		});
	});
});
