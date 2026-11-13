import type { IDataObject, IHookFunctions } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { CalTrigger } from '../CalTrigger.node';
import type { CalTriggerV1 } from '../v1/CalTriggerV1.node';
import type { CalTriggerV2 } from '../v2/CalTriggerV2.node';

describe('CalTrigger request URLs', () => {
	let urls: string[];
	let webhookData: IDataObject;
	let parameters: IDataObject;
	let context: ReturnType<typeof mockDeep<IHookFunctions>>;

	beforeEach(() => {
		urls = [];
		webhookData = {};
		parameters = {};
		context = mockDeep<IHookFunctions>();
		context.getCredentials.mockResolvedValue({ host: 'https://api.cal.com', apiKey: 'cal_key' });
		context.getWorkflowStaticData.mockReturnValue(webhookData);
		context.getNodeWebhookUrl.mockReturnValue('https://example.com/webhook');
		context.getNodeParameter.mockImplementation((name: string) => parameters[name] as never);
		const record = async (options: { method?: string; baseURL?: string; url: unknown }) => {
			urls.push(`${options.method} ${options.baseURL}${String(options.url)}`);
			return options.method === 'GET' ? { data: [] } : { data: { id: 456 } };
		};
		context.helpers.httpRequest.mockImplementation(record);
		context.helpers.httpRequestWithAuthentication.mockImplementation(
			async (_credentialsType, options) => await record(options),
		);
	});

	it('should build v1 webhook URLs', async () => {
		const trigger = new CalTrigger().getNodeType(2) as CalTriggerV1;

		parameters.version = 2;
		webhookData.webhookId = 'wh_1';
		await trigger.webhookMethods.default.delete.call(context);

		parameters.version = 1;
		webhookData.webhookId = 'wh_2';
		await trigger.webhookMethods.default.delete.call(context);

		expect(urls).toEqual([
			'DELETE https://api.cal.com/webhooks/wh_1',
			'DELETE https://api.cal.com/hooks/wh_2',
		]);
	});

	it('should build v2 webhook URLs', async () => {
		const trigger = new CalTrigger().getNodeType(3) as CalTriggerV2;
		parameters.events = ['BOOKING_CREATED'];
		parameters.options = { eventTypeId: 42 };

		await trigger.webhookMethods.default.checkExists.call(context);
		await trigger.webhookMethods.default.create.call(context);
		await trigger.webhookMethods.default.delete.call(context);

		webhookData.webhookId = 789;
		await trigger.webhookMethods.default.delete.call(context);

		expect(urls).toEqual([
			'GET https://api.cal.com/v2/event-types/42/webhooks',
			'POST https://api.cal.com/v2/event-types/42/webhooks',
			'DELETE https://api.cal.com/v2/event-types/42/webhooks/456',
			'DELETE https://api.cal.com/v2/webhooks/789',
		]);
	});
});
