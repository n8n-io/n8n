import { mockDeep } from 'jest-mock-extended';
import type { IDataObject, IHookFunctions } from 'n8n-workflow';

import { CalTrigger } from '../CalTrigger.node';

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
		context.helpers.httpRequestWithAuthentication.mockImplementation(
			async (_credentialsType, options) => await record(options),
		);
	});

	it('should build webhook URLs', async () => {
		const trigger = new CalTrigger();

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
});
