import { mock } from 'jest-mock-extended';
import type { IHookFunctions } from 'n8n-workflow';

import { BoxTrigger } from '../BoxTrigger.node';

describe('Box Trigger Webhook Lifecycle', () => {
	const mockHookFunctions = mock<IHookFunctions>();
	const mockStaticData: Record<string, string> = {};
	const mockRequestOAuth2 = jest.fn();

	beforeEach(() => {
		// resetAllMocks clears Once queues and implementations — prevents bleed between tests
		jest.resetAllMocks();
		Object.keys(mockStaticData).forEach((key) => delete mockStaticData[key]);
		mockHookFunctions.getWorkflowStaticData.mockReturnValue(mockStaticData);
		mockHookFunctions.getNodeWebhookUrl.mockReturnValue('https://n8n.io/webhook/box-test');
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
		mockHookFunctions.helpers = {
			...mockHookFunctions.helpers,
			requestOAuth2: mockRequestOAuth2,
		};
	});

	describe('checkExists', () => {
		it('should return false and not store webhook ID when no matching webhook exists', async () => {
			// List response: mini-webhook only (new Box API — no address/triggers in list)
			mockRequestOAuth2
				.mockResolvedValueOnce({
					entries: [{ id: 'webhook_123', type: 'webhook', target: { id: '67890', type: 'file' } }],
					// no next_marker — single page
				})
				// Full details for webhook_123 — address doesn't match
				.mockResolvedValueOnce({
					id: 'webhook_123',
					address: 'https://other-app.com/webhook',
					target: { id: '67890', type: 'file' },
					triggers: ['FILE.UPLOADED'],
				});

			const boxTrigger = new BoxTrigger();
			const exists = await boxTrigger.webhookMethods.default.checkExists.call(mockHookFunctions);

			expect(exists).toBe(false);
			expect(mockStaticData.webhookId).toBeUndefined();
		});

		it('should return true and store the correct webhook ID when a matching webhook exists', async () => {
			// List returns two mini-webhooks; webhook_123 is skipped (target.id mismatch),
			// only webhook_456 gets a full GET call
			mockRequestOAuth2
				.mockResolvedValueOnce({
					entries: [
						{ id: 'webhook_123', type: 'webhook', target: { id: '67890', type: 'file' } },
						{ id: 'webhook_456', type: 'webhook', target: { id: '12345', type: 'file' } },
					],
				})
				// Full details only for webhook_456 — webhook_123 is pre-filtered out
				.mockResolvedValueOnce({
					id: 'webhook_456',
					address: 'https://n8n.io/webhook/box-test',
					target: { id: '12345', type: 'file' },
					triggers: ['FILE.UPLOADED'],
				});

			const boxTrigger = new BoxTrigger();
			const exists = await boxTrigger.webhookMethods.default.checkExists.call(mockHookFunctions);

			expect(exists).toBe(true);
			expect(mockStaticData.webhookId).toBe('webhook_456');
		});

		it('should return false when address and target match but a required event is missing', async () => {
			mockRequestOAuth2
				.mockResolvedValueOnce({
					entries: [{ id: 'webhook_456', type: 'webhook', target: { id: '12345', type: 'file' } }],
				})
				.mockResolvedValueOnce({
					id: 'webhook_456',
					address: 'https://n8n.io/webhook/box-test',
					target: { id: '12345', type: 'file' },
					triggers: ['FILE.DOWNLOADED'], // missing FILE.UPLOADED
				});

			const boxTrigger = new BoxTrigger();
			const exists = await boxTrigger.webhookMethods.default.checkExists.call(mockHookFunctions);

			expect(exists).toBe(false);
			expect(mockStaticData.webhookId).toBeUndefined();
		});

		it('should return false when webhook target type does not match', async () => {
			mockRequestOAuth2
				.mockResolvedValueOnce({
					entries: [
						{ id: 'webhook_456', type: 'webhook', target: { id: '12345', type: 'folder' } },
					],
				})
				.mockResolvedValueOnce({
					id: 'webhook_456',
					address: 'https://n8n.io/webhook/box-test',
					target: { id: '12345', type: 'folder' }, // wrong type
					triggers: ['FILE.UPLOADED'],
				});

			const boxTrigger = new BoxTrigger();
			const exists = await boxTrigger.webhookMethods.default.checkExists.call(mockHookFunctions);

			expect(exists).toBe(false);
			expect(mockStaticData.webhookId).toBeUndefined();
		});

		it('should page through multiple pages using next_marker before fetching individual webhooks', async () => {
			// All list pages are consumed first by boxApiRequestAllItemsMarker,
			// then per-webhook GET calls happen during the checkExists loop.
			// webhook_123 (target 67890) is pre-filtered out — no GET for it.
			mockRequestOAuth2
				// List page 1 — has next_marker
				.mockResolvedValueOnce({
					entries: [{ id: 'webhook_123', type: 'webhook', target: { id: '67890', type: 'file' } }],
					next_marker: 'page2marker',
				})
				// List page 2 (next_marker consumed) — no further pages
				.mockResolvedValueOnce({
					entries: [{ id: 'webhook_456', type: 'webhook', target: { id: '12345', type: 'file' } }],
				})
				// Full details only for webhook_456 — webhook_123 is pre-filtered out
				.mockResolvedValueOnce({
					id: 'webhook_456',
					address: 'https://n8n.io/webhook/box-test',
					target: { id: '12345', type: 'file' },
					triggers: ['FILE.UPLOADED'],
				});

			const boxTrigger = new BoxTrigger();
			const exists = await boxTrigger.webhookMethods.default.checkExists.call(mockHookFunctions);

			expect(exists).toBe(true);
			expect(mockStaticData.webhookId).toBe('webhook_456');

			// 2 list calls (pagination) + 1 GET (webhook_123 skipped by target pre-filter) = 3 total
			// If pagination didn't work, webhook_456 (page 2 only) would never be found
			expect(mockRequestOAuth2).toHaveBeenCalledTimes(3);
		});

		it('should skip the full GET fetch for webhooks whose target does not match', async () => {
			// Two webhooks in list — only second has matching target
			mockRequestOAuth2
				.mockResolvedValueOnce({
					entries: [
						{
							id: 'webhook_wrong_target',
							type: 'webhook',
							target: { id: 'other_id', type: 'file' },
						},
						{ id: 'webhook_456', type: 'webhook', target: { id: '12345', type: 'file' } },
					],
				})
				// Only one full GET expected — for webhook_456 (wrong_target is skipped)
				.mockResolvedValueOnce({
					id: 'webhook_456',
					address: 'https://n8n.io/webhook/box-test',
					target: { id: '12345', type: 'file' },
					triggers: ['FILE.UPLOADED'],
				});

			const boxTrigger = new BoxTrigger();
			const exists = await boxTrigger.webhookMethods.default.checkExists.call(mockHookFunctions);

			expect(exists).toBe(true);
			expect(mockStaticData.webhookId).toBe('webhook_456');
			// 1 list call + 1 GET (not 2) — wrong-target webhook was skipped
			expect(mockRequestOAuth2).toHaveBeenCalledTimes(2);
		});

		it('should return false when the webhook list is empty', async () => {
			mockRequestOAuth2.mockResolvedValueOnce({ entries: [] });

			const boxTrigger = new BoxTrigger();
			const exists = await boxTrigger.webhookMethods.default.checkExists.call(mockHookFunctions);

			expect(exists).toBe(false);
			expect(mockStaticData.webhookId).toBeUndefined();
		});

		it('should match when the stored webhook has a superset of the required events', async () => {
			mockRequestOAuth2
				.mockResolvedValueOnce({
					entries: [{ id: 'webhook_456', type: 'webhook', target: { id: '12345', type: 'file' } }],
				})
				.mockResolvedValueOnce({
					id: 'webhook_456',
					address: 'https://n8n.io/webhook/box-test',
					target: { id: '12345', type: 'file' },
					triggers: ['FILE.UPLOADED', 'FILE.DOWNLOADED'], // superset — should still match
				});

			const boxTrigger = new BoxTrigger();
			const exists = await boxTrigger.webhookMethods.default.checkExists.call(mockHookFunctions);

			expect(exists).toBe(true);
			expect(mockStaticData.webhookId).toBe('webhook_456');
		});
	});

	describe('create', () => {
		it('should create a new webhook and store its ID', async () => {
			mockRequestOAuth2.mockResolvedValue({ id: 'webhook_new_789' });

			const boxTrigger = new BoxTrigger();
			const created = await boxTrigger.webhookMethods.default.create.call(mockHookFunctions);

			expect(created).toBe(true);
			expect(mockStaticData.webhookId).toBe('webhook_new_789');
			expect(mockRequestOAuth2).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					method: 'POST',
					uri: 'https://api.box.com/2.0/webhooks',
					body: {
						address: 'https://n8n.io/webhook/box-test',
						triggers: ['FILE.UPLOADED'],
						target: { id: '12345', type: 'file' },
					},
				}),
				expect.anything(),
			);
		});

		it('should return false when the API response has no ID', async () => {
			mockRequestOAuth2.mockResolvedValue({});

			const boxTrigger = new BoxTrigger();
			const created = await boxTrigger.webhookMethods.default.create.call(mockHookFunctions);

			expect(created).toBe(false);
			expect(mockStaticData.webhookId).toBeUndefined();
		});
	});

	describe('delete', () => {
		it('should call DELETE with the stored webhook ID and clear static data', async () => {
			mockStaticData.webhookId = 'webhook_456';
			mockRequestOAuth2.mockResolvedValue({});

			const boxTrigger = new BoxTrigger();
			const deleted = await boxTrigger.webhookMethods.default.delete.call(mockHookFunctions);

			expect(deleted).toBe(true);
			expect(mockRequestOAuth2).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					method: 'DELETE',
					uri: 'https://api.box.com/2.0/webhooks/webhook_456',
				}),
				expect.anything(),
			);
			expect(mockStaticData.webhookId).toBeUndefined();
		});

		it('should return true without making an API call when no webhook ID is stored', async () => {
			const boxTrigger = new BoxTrigger();
			const deleted = await boxTrigger.webhookMethods.default.delete.call(mockHookFunctions);

			expect(deleted).toBe(true);
			expect(mockRequestOAuth2).not.toHaveBeenCalled();
		});

		it('should return false and keep the webhook ID when the API call fails', async () => {
			mockStaticData.webhookId = 'webhook_456';
			mockRequestOAuth2.mockRejectedValue(new Error('API Error'));

			const boxTrigger = new BoxTrigger();
			const deleted = await boxTrigger.webhookMethods.default.delete.call(mockHookFunctions);

			expect(deleted).toBe(false);
			expect(mockStaticData.webhookId).toBe('webhook_456');
		});
	});
});
