import { mockDeep } from 'jest-mock-extended';
import type { IHookFunctions } from 'n8n-workflow';

import { ConvertKitTrigger } from '../ConvertKitTrigger.node';

describe('ConvertKitTrigger', () => {
	it('should delete the webhook by its ID', async () => {
		const context = mockDeep<IHookFunctions>();
		context.getWorkflowStaticData.mockReturnValue({ webhookId: 9182 });
		context.helpers.httpRequestWithAuthentication.mockResolvedValue({});

		const result = await new ConvertKitTrigger().webhookMethods.default.delete.call(context);

		expect(result).toBe(true);
		const [, options] = context.helpers.httpRequestWithAuthentication.mock.calls[0];
		expect(options.method).toBe('DELETE');
		expect(String(options.url)).toBe('https://api.convertkit.com/v3/automations/hooks/9182');
	});
});
