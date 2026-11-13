import { mockDeep } from 'jest-mock-extended';
import type { IHookFunctions, IRequestOptions } from 'n8n-workflow';

import { AutopilotTrigger } from '../AutopilotTrigger.node';

describe('AutopilotTrigger', () => {
	it('should delete the webhook by its ID', async () => {
		const context = mockDeep<IHookFunctions>();
		context.getWorkflowStaticData.mockReturnValue({ webhookId: 'hook_0A1B2C3D' });
		context.getCredentials.mockResolvedValue({ apiKey: 'fake-api-key' });
		context.helpers.request.mockResolvedValue({});

		const deleted = await new AutopilotTrigger().webhookMethods.default.delete.call(context);

		expect(deleted).toBe(true);
		const [options] = context.helpers.request.mock.calls[0];
		expect(String((options as IRequestOptions).uri)).toBe(
			'https://api2.autopilothq.com/v1/hook/hook_0A1B2C3D',
		);
	});
});
