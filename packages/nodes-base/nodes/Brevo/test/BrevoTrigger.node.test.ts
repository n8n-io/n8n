import { mock } from 'vitest-mock-extended';
import type { IDataObject, IHookFunctions, IRequestOptions } from 'n8n-workflow';

import { BrevoTrigger } from '../BrevoTrigger.node';

describe('BrevoTrigger', () => {
	const trigger = new BrevoTrigger();
	const webhookUrl = 'https://n8n.example.com/webhook/abc';
	let staticData: IDataObject;
	let requests: Array<{ method?: string; url: string }>;
	let hookFunctions: IHookFunctions;

	beforeEach(() => {
		staticData = {};
		requests = [];
		const requestWithAuthentication = vi.fn(
			async (_credentialsType: string, options: IRequestOptions) => {
				const url = new URL(String(options.uri));
				for (const [key, value] of Object.entries(options.qs ?? {})) {
					url.searchParams.append(key, String(value));
				}
				requests.push({ method: options.method, url: url.toString() });
				if (options.method === 'GET') {
					return JSON.stringify({
						webhooks: [{ id: 42, type: 'transactional', events: ['delivered'], url: webhookUrl }],
					});
				}
				return options.method === 'POST' ? JSON.stringify({ id: 42 }) : '';
			},
		);
		hookFunctions = mock<IHookFunctions>({ helpers: { requestWithAuthentication } });
		vi.mocked(hookFunctions.getWorkflowStaticData).mockReturnValue(staticData);
		vi.mocked(hookFunctions.getNodeWebhookUrl).mockReturnValue(webhookUrl);
		vi.mocked(hookFunctions.getNodeParameter).mockImplementation((name: string) =>
			name === 'type' ? 'transactional' : ['delivered'],
		);
	});

	it('should request the webhook list with the type', async () => {
		const result = await trigger.webhookMethods.default.checkExists.call(hookFunctions);

		expect(result).toBe(true);
		expect(requests).toEqual([
			{ method: 'GET', url: 'https://api.brevo.com/v3/webhooks?type=transactional' },
		]);
	});

	it('should create a webhook', async () => {
		const result = await trigger.webhookMethods.default.create.call(hookFunctions);

		expect(result).toBe(true);
		expect(requests).toEqual([{ method: 'POST', url: 'https://api.brevo.com/v3/webhooks' }]);
	});

	it('should delete the webhook by ID', async () => {
		staticData.webhookId = 42;

		const result = await trigger.webhookMethods.default.delete.call(hookFunctions);

		expect(result).toBe(true);
		expect(requests).toEqual([{ method: 'DELETE', url: 'https://api.brevo.com/v3/webhooks/42' }]);
	});
});
