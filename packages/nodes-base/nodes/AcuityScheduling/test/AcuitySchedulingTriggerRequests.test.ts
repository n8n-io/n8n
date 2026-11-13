import type { IDataObject, IHookFunctions, IWebhookFunctions } from 'n8n-workflow';

import { AcuitySchedulingTrigger } from '../AcuitySchedulingTrigger.node';

vi.mock('../AcuitySchedulingTriggerHelpers', () => ({
	verifySignature: vi.fn().mockResolvedValue(true),
}));

describe('AcuitySchedulingTrigger request URLs', () => {
	const trigger = new AcuitySchedulingTrigger();
	const request = vi.fn();
	const staticData: IDataObject = {};
	const parameters: IDataObject = {
		authentication: 'apiKey',
		event: 'appointment.scheduled',
		resolveData: true,
	};

	const context = {
		getNodeParameter: vi.fn((name: string) => parameters[name]),
		getCredentials: vi.fn().mockResolvedValue({ userId: '12345', apiKey: 'test-api-key' }),
		getNode: vi.fn(),
		getNodeWebhookUrl: vi.fn().mockReturnValue('https://n8n.example.com/webhook/acuity'),
		getWorkflowStaticData: vi.fn().mockReturnValue(staticData),
		getRequestObject: vi.fn().mockReturnValue({ body: { id: 1047823 } }),
		helpers: {
			request,
			returnJsonArray: vi.fn((data: IDataObject) => [{ json: data }]),
		},
	};
	const hookContext = context as unknown as IHookFunctions;

	const requestedUri = () => String(request.mock.calls[0][0].uri);

	beforeEach(() => {
		request.mockReset();
		staticData.webhookId = 731;
	});

	it('should list webhooks', async () => {
		request.mockResolvedValue([]);
		await trigger.webhookMethods.default.checkExists.call(hookContext);
		expect(requestedUri()).toBe('https://acuityscheduling.com/api/v1/webhooks');
	});

	it('should create a webhook', async () => {
		request.mockResolvedValue({ id: 732 });
		await trigger.webhookMethods.default.create.call(hookContext);
		expect(requestedUri()).toBe('https://acuityscheduling.com/api/v1/webhooks');
	});

	it('should delete the webhook', async () => {
		request.mockResolvedValue({});
		await trigger.webhookMethods.default.delete.call(hookContext);
		expect(requestedUri()).toBe('https://acuityscheduling.com/api/v1/webhooks/731');
	});

	it('should resolve the appointment', async () => {
		request.mockResolvedValue({ id: 1047823 });
		await trigger.webhook.call(context as unknown as IWebhookFunctions);
		expect(requestedUri()).toBe('https://acuityscheduling.com/api/v1/appointments/1047823');
	});
});
