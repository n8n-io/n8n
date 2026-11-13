import { mock } from 'vitest-mock-extended';
import type { IDataObject, IHookFunctions, IRequestOptions } from 'n8n-workflow';

import { EmeliaTrigger } from '../EmeliaTrigger.node';

describe('EmeliaTrigger', () => {
	const trigger = new EmeliaTrigger();
	const webhookUrl = 'https://n8n.example.com/webhook/abc';
	const campaignId = '64b7f1c2e4b0a1d2c3e4f5a6';
	let staticData: IDataObject;
	let requests: Array<{ method?: string; url: string }>;
	let hookFunctions: IHookFunctions;

	beforeEach(() => {
		staticData = {};
		requests = [];
		const request = vi.fn(async (options: IRequestOptions) => {
			requests.push({ method: options.method, url: String(options.uri) });
			if (options.method === 'GET') {
				return { webhooks: [{ url: webhookUrl, campaignId }] };
			}
			return { webhookId: 'wh_1a2b3c' };
		});
		hookFunctions = mock<IHookFunctions>({ helpers: { request } });
		vi.mocked(hookFunctions.getCredentials).mockResolvedValue({ apiKey: 'fake-api-key' });
		vi.mocked(hookFunctions.getWorkflowStaticData).mockReturnValue(staticData);
		vi.mocked(hookFunctions.getNodeWebhookUrl).mockReturnValue(webhookUrl);
		vi.mocked(hookFunctions.getNodeParameter).mockImplementation((name: string) =>
			name === 'campaignId' ? campaignId : ['replied'],
		);
	});

	it('should request the webhook list', async () => {
		const result = await trigger.webhookMethods.default.checkExists.call(hookFunctions);

		expect(result).toBe(true);
		expect(requests).toEqual([{ method: 'GET', url: 'https://graphql.emelia.io/webhook' }]);
	});

	it('should create a webhook', async () => {
		const result = await trigger.webhookMethods.default.create.call(hookFunctions);

		expect(result).toBe(true);
		expect(requests).toEqual([
			{ method: 'POST', url: 'https://graphql.emelia.io/webhook/webhook' },
		]);
	});

	it('should delete the webhook', async () => {
		const result = await trigger.webhookMethods.default.delete.call(hookFunctions);

		expect(result).toBe(true);
		expect(requests).toEqual([
			{ method: 'DELETE', url: 'https://graphql.emelia.io/webhook/webhook' },
		]);
	});
});
