import type { IDataObject, IWebhookFunctions } from 'n8n-workflow';

import { CurrentsTrigger } from '../CurrentsTrigger.node';

// Mock the helper module
jest.mock('../CurrentsTriggerHelpers', () => ({
	verifyWebhook: jest.fn(),
}));

import { verifyWebhook } from '../CurrentsTriggerHelpers';

describe('CurrentsTrigger', () => {
	let trigger: CurrentsTrigger;
	let mockWebhookFunctions: Partial<IWebhookFunctions>;
	let mockResponse: { status: jest.Mock; send: jest.Mock; end: jest.Mock };

	beforeEach(() => {
		trigger = new CurrentsTrigger();
		mockResponse = {
			status: jest.fn().mockReturnThis(),
			send: jest.fn().mockReturnThis(),
			end: jest.fn().mockReturnThis(),
		};

		mockWebhookFunctions = {
			getBodyData: jest.fn(),
			getNodeParameter: jest.fn(),
			getResponseObject: jest.fn().mockReturnValue(mockResponse),
			helpers: {
				returnJsonArray: jest.fn((data) => data),
			} as unknown as IWebhookFunctions['helpers'],
		};

		(verifyWebhook as jest.Mock).mockReturnValue(true);
	});

	describe('webhook', () => {
		it('should return 401 when verification fails', async () => {
			(verifyWebhook as jest.Mock).mockReturnValue(false);

			const result = await trigger.webhook.call(mockWebhookFunctions as IWebhookFunctions);

			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.send).toHaveBeenCalledWith('Unauthorized');
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('should trigger workflow when event matches selected events', async () => {
			const bodyData: IDataObject = {
				event: 'RUN_FINISH',
				runUrl: 'https://app.currents.dev/run/123',
				buildId: 'build-456',
			};

			(mockWebhookFunctions.getBodyData as jest.Mock).mockReturnValue(bodyData);
			(mockWebhookFunctions.getNodeParameter as jest.Mock).mockReturnValue([
				'RUN_FINISH',
				'RUN_START',
			]);

			const result = await trigger.webhook.call(mockWebhookFunctions as IWebhookFunctions);

			expect(result.workflowData).toBeDefined();
			expect(mockWebhookFunctions.helpers!.returnJsonArray).toHaveBeenCalledWith([bodyData]);
		});

		it('should acknowledge but not trigger when event does not match', async () => {
			const bodyData: IDataObject = {
				event: 'RUN_TIMEOUT',
				runUrl: 'https://app.currents.dev/run/123',
			};

			(mockWebhookFunctions.getBodyData as jest.Mock).mockReturnValue(bodyData);
			(mockWebhookFunctions.getNodeParameter as jest.Mock).mockReturnValue([
				'RUN_FINISH',
				'RUN_START',
			]);

			const result = await trigger.webhook.call(mockWebhookFunctions as IWebhookFunctions);

			expect(result).toEqual({ webhookResponse: 'OK' });
			expect(result.workflowData).toBeUndefined();
		});

		it('should trigger workflow for all events when no filter is set', async () => {
			const bodyData: IDataObject = {
				event: 'RUN_CANCELED',
				runUrl: 'https://app.currents.dev/run/123',
			};

			(mockWebhookFunctions.getBodyData as jest.Mock).mockReturnValue(bodyData);
			(mockWebhookFunctions.getNodeParameter as jest.Mock).mockReturnValue([]);

			const result = await trigger.webhook.call(mockWebhookFunctions as IWebhookFunctions);

			expect(result.workflowData).toBeDefined();
		});

		it('should pass full webhook payload to workflow', async () => {
			const bodyData: IDataObject = {
				event: 'RUN_FINISH',
				runUrl: 'https://app.currents.dev/run/123',
				buildId: 'build-456',
				groupId: 'group-1',
				tags: ['smoke', 'regression'],
				commit: {
					sha: 'abc123',
					branch: 'main',
					authorName: 'Test Author',
				},
				failures: 0,
				passes: 42,
				flaky: 2,
			};

			(mockWebhookFunctions.getBodyData as jest.Mock).mockReturnValue(bodyData);
			(mockWebhookFunctions.getNodeParameter as jest.Mock).mockReturnValue(['RUN_FINISH']);

			const result = await trigger.webhook.call(mockWebhookFunctions as IWebhookFunctions);

			expect(mockWebhookFunctions.helpers!.returnJsonArray).toHaveBeenCalledWith([bodyData]);
			expect(result.workflowData).toBeDefined();
		});
	});

	describe('description', () => {
		it('should have correct node metadata', () => {
			expect(trigger.description.displayName).toBe('Currents Trigger');
			expect(trigger.description.name).toBe('currentsTrigger');
			expect(trigger.description.group).toContain('trigger');
		});

		it('should have all webhook event options', () => {
			const eventsProperty = trigger.description.properties.find((p) => p.name === 'events');
			expect(eventsProperty).toBeDefined();
			expect(eventsProperty?.type).toBe('multiOptions');

			const options = (eventsProperty as { options?: Array<{ value: string }> })?.options ?? [];
			const eventValues = options.map((o) => o.value);

			expect(eventValues).toContain('RUN_START');
			expect(eventValues).toContain('RUN_FINISH');
			expect(eventValues).toContain('RUN_TIMEOUT');
			expect(eventValues).toContain('RUN_CANCELED');
		});
	});
});
