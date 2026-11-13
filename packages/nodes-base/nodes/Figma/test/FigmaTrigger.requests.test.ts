import type { IHookFunctions, IRequestOptions } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { FigmaTrigger } from '../FigmaTrigger.node';

describe('FigmaTrigger > request URLs', () => {
	const trigger = new FigmaTrigger();
	const context = mockDeep<IHookFunctions>();
	const parameters: Record<string, string> = {
		authentication: 'accessToken',
		teamId: '1234567890',
		triggerOn: 'fileUpdate',
	};

	beforeEach(() => {
		jest.clearAllMocks();
		context.getNodeParameter.mockImplementation((name: string) => parameters[name]);
		context.getCredentials.mockResolvedValue({ accessToken: 'fake-token' });
		context.getNodeWebhookUrl.mockReturnValue('https://n8n.example.com/webhook/figma');
		context.getWorkflowStaticData.mockReturnValue({ webhookId: '987' });
		context.helpers.request.mockResolvedValue({ webhooks: [], id: '987' });
	});

	const requestedUris = () =>
		context.helpers.request.mock.calls.map(([options]) => String((options as IRequestOptions).uri));

	it('should send the webhook requests to the Figma API URLs', async () => {
		await trigger.webhookMethods.default.checkExists.call(context);
		await trigger.webhookMethods.default.create.call(context);
		await trigger.webhookMethods.default.delete.call(context);

		expect(requestedUris()).toEqual([
			'https://api.figma.com/v2/teams/1234567890/webhooks',
			'https://api.figma.com/v2/webhooks',
			'https://api.figma.com/v2/webhooks/987',
		]);
	});
});
