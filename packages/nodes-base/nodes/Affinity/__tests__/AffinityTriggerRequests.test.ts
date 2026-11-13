import type { IDataObject, IHookFunctions, IWebhookFunctions } from 'n8n-workflow';

import { AffinityTrigger } from '../AffinityTrigger.node';

describe('AffinityTrigger request URLs', () => {
	const trigger = new AffinityTrigger();
	const request = jest.fn();
	const staticData: IDataObject = {};

	const context = {
		getNodeParameter: jest.fn().mockReturnValue(['person.created']),
		getCredentials: jest.fn().mockResolvedValue({ apiKey: 'test-api-key' }),
		getNode: jest.fn(),
		getNodeWebhookUrl: jest.fn().mockReturnValue('https://n8n.example.com/webhook/affinity'),
		getWorkflowStaticData: jest.fn().mockReturnValue(staticData),
		getBodyData: jest.fn().mockReturnValue({ type: 'person.created', body: { id: 38706 } }),
		helpers: {
			request,
			returnJsonArray: jest.fn((data: IDataObject) => [{ json: data }]),
		},
	};
	const hookContext = context as unknown as IHookFunctions;

	const requestedUri = () => String(request.mock.calls[0][0].uri);

	beforeEach(() => {
		request.mockReset();
		staticData.webhookId = 1024;
	});

	it('should list webhooks', async () => {
		request.mockResolvedValue([]);
		await trigger.webhookMethods.default.checkExists.call(hookContext);
		expect(requestedUri()).toBe('https://api.affinity.co/webhook');
	});

	it('should create a webhook', async () => {
		request.mockResolvedValue({ id: 1025 });
		await trigger.webhookMethods.default.create.call(hookContext);
		expect(requestedUri()).toBe('https://api.affinity.co/webhook/subscribe');
	});

	it('should delete the webhook', async () => {
		request.mockResolvedValue({ success: true });
		await trigger.webhookMethods.default.delete.call(hookContext);
		expect(requestedUri()).toBe('https://api.affinity.co/webhook/1024');
	});

	it('should resolve the person', async () => {
		request.mockResolvedValue({ id: 38706 });
		await trigger.webhook.call(context as unknown as IWebhookFunctions);
		expect(requestedUri()).toBe('https://api.affinity.co/persons/38706');
	});
});
