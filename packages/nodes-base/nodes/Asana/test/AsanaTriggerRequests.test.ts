import type { IDataObject, IHookFunctions } from 'n8n-workflow';

import { AsanaTrigger } from '../AsanaTrigger.node';

describe('AsanaTrigger request URLs', () => {
	const trigger = new AsanaTrigger();
	const requestWithAuthentication = jest.fn();
	const staticData: IDataObject = {};
	const parameters: IDataObject = {
		authentication: 'accessToken',
		resource: '1205000000000001',
		workspace: '1201234567890001',
	};

	const context = {
		getNodeParameter: jest.fn((name: string) => parameters[name]),
		getNode: jest.fn(),
		getNodeWebhookUrl: jest.fn().mockReturnValue('https://n8n.example.com/webhook/asana'),
		getWorkflowStaticData: jest.fn().mockReturnValue(staticData),
		helpers: { requestWithAuthentication },
	} as unknown as IHookFunctions;

	const requestedUrl = () => String(requestWithAuthentication.mock.calls[0][1].url);

	beforeEach(() => {
		requestWithAuthentication.mockReset();
		staticData.webhookId = '1211000000000001';
	});

	it('should list webhooks', async () => {
		requestWithAuthentication.mockResolvedValue({ data: [] });
		await trigger.webhookMethods.default.checkExists.call(context);
		expect(requestedUrl()).toBe('https://app.asana.com/api/1.0/webhooks');
	});

	it('should create a webhook', async () => {
		requestWithAuthentication.mockResolvedValue({ data: { gid: '1211000000000002' } });
		await trigger.webhookMethods.default.create.call(context);
		expect(requestedUrl()).toBe('https://app.asana.com/api/1.0/webhooks');
	});

	it('should delete the webhook', async () => {
		requestWithAuthentication.mockResolvedValue({});
		await trigger.webhookMethods.default.delete.call(context);
		expect(requestedUrl()).toBe('https://app.asana.com/api/1.0/webhooks/1211000000000001');
	});
});
