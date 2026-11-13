import { mockDeep } from 'vitest-mock-extended';
import type { IHookFunctions } from 'n8n-workflow';

import { CustomerIoTrigger } from '../CustomerIoTrigger.node';

describe('CustomerIoTrigger webhook methods', () => {
	it.each([
		['track.customer.io', 'https://api.customer.io/v1/reporting_webhooks/31'],
		['track-eu.customer.io', 'https://api-eu.customer.io/v1/reporting_webhooks/31'],
	])('should delete the webhook by its ID for region %s', async (region, url) => {
		const context = mockDeep<IHookFunctions>();
		context.getWorkflowStaticData.mockReturnValue({ webhookId: 31 });
		context.getCredentials.mockResolvedValue({ region });
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		const result = await new CustomerIoTrigger().webhookMethods.default.delete.call(context);

		expect(result).toBe(true);
		const [, options] = context.helpers.requestWithAuthentication.mock.calls[0];
		expect(String('url' in options ? options.url : undefined)).toBe(url);
	});
});
