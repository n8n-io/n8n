import { mockDeep } from 'vitest-mock-extended';
import type { IHookFunctions } from 'n8n-workflow';

import { CopperTrigger } from '../CopperTrigger.node';

describe('CopperTrigger', () => {
	const webhookUrl = 'https://api.copper.com/developer_api/v1/webhooks/48213';

	it.each(['checkExists', 'delete'] as const)(
		'should send %s to the webhook URL',
		async (method) => {
			const context = mockDeep<IHookFunctions>();
			context.getWorkflowStaticData.mockReturnValue({ webhookId: 48213 });
			context.helpers.requestWithAuthentication.mockResolvedValue({});

			const result = await new CopperTrigger().webhookMethods.default[method].call(context);

			expect(result).toBe(true);
			const [, options] = context.helpers.requestWithAuthentication.mock.calls[0];
			expect(String('url' in options ? options.url : undefined)).toBe(webhookUrl);
		},
	);
});
