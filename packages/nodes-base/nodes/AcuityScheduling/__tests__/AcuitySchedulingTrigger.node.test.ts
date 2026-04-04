import type { IHookFunctions, IWebhookFunctions } from 'n8n-workflow';

import { AcuitySchedulingTrigger } from '../AcuitySchedulingTrigger.node';
import { verifySignature } from '../AcuitySchedulingTriggerHelpers';
import { acuitySchedulingApiRequest } from '../GenericFunctions';

jest.mock('../GenericFunctions', () => ({
	acuitySchedulingApiRequest: jest.fn(),
}));

jest.mock('../AcuitySchedulingTriggerHelpers', () => ({
	verifySignature: jest.fn().mockResolvedValue(true),
}));

const mockedAcuitySchedulingApiRequest = jest.mocked(acuitySchedulingApiRequest);
const mockedVerifySignature = jest.mocked(verifySignature);

describe('AcuityScheduling Trigger Node', () => {
	let node: AcuitySchedulingTrigger;
	let mockNodeFunctions: IHookFunctions;

	beforeEach(() => {
		node = new AcuitySchedulingTrigger();

		mockNodeFunctions = {
			getNodeWebhookUrl: jest.fn().mockReturnValue('https://webhook.url/test'),
			getNodeParameter: jest.fn(),
			getWorkflowStaticData: jest.fn().mockReturnValue({}),
			getNode: jest.fn().mockReturnValue({ name: 'AcuitySchedulingTrigger' }),
		} as unknown as IHookFunctions;

		mockedAcuitySchedulingApiRequest.mockResolvedValue({
			id: 123,
			event: 'appointment.scheduled',
			target: 'https://webhook.url/test',
			status: 'active',
		});

		mockedAcuitySchedulingApiRequest.mockClear();
		mockedVerifySignature.mockClear();
	});

	afterAll(() => {
		jest.clearAllMocks();
	});

	describe('webhookMethods', () => {
		it('should create webhook with correct parameters', async () => {
			(mockNodeFunctions.getNodeParameter as jest.Mock).mockReturnValue('appointment.scheduled');

			await node.webhookMethods.default.create.call(mockNodeFunctions);

			expect(mockedAcuitySchedulingApiRequest).toHaveBeenCalledWith('POST', '/webhooks', {
				target: 'https://webhook.url/test',
				event: 'appointment.scheduled',
			});
		});

		it('should check if webhook exists', async () => {
			const staticData = { webhookId: 123 };
			(mockNodeFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue(staticData);
			mockedAcuitySchedulingApiRequest.mockResolvedValue([{ id: 123 }]);

			const result = await node.webhookMethods.default.checkExists.call(mockNodeFunctions);

			expect(result).toBe(true);
			expect(mockedAcuitySchedulingApiRequest).toHaveBeenCalledWith('GET', '/webhooks');
		});

		it('should return false when webhook does not exist', async () => {
			const staticData = { webhookId: 123 };
			(mockNodeFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue(staticData);
			mockedAcuitySchedulingApiRequest.mockResolvedValue([{ id: 456 }]);

			const result = await node.webhookMethods.default.checkExists.call(mockNodeFunctions);

			expect(result).toBe(false);
		});

		it('should delete webhook', async () => {
			const staticData = { webhookId: 123 };
			(mockNodeFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue(staticData);

			const result = await node.webhookMethods.default.delete.call(mockNodeFunctions);

			expect(result).toBe(true);
			expect(mockedAcuitySchedulingApiRequest).toHaveBeenCalledWith('DELETE', '/webhooks/123');
			expect(staticData.webhookId).toBeUndefined();
		});
	});

	describe('webhook signature verification', () => {
		let mockWebhookFunctions: IWebhookFunctions;
		const testBody = { action: 'appointment.scheduled', id: 123, calendarID: 1 };

		beforeEach(() => {
			mockWebhookFunctions = {
				getBodyData: jest.fn().mockReturnValue(testBody),
				getRequestObject: jest.fn().mockReturnValue({
					body: testBody,
				}),
				getResponseObject: jest.fn().mockReturnValue({
					status: jest.fn().mockReturnThis(),
					send: jest.fn().mockReturnThis(),
					end: jest.fn(),
				}),
				getNodeParameter: jest.fn().mockReturnValue(false),
				helpers: {
					returnJsonArray: jest.fn().mockImplementation((data) => [data]),
				},
			} as unknown as IWebhookFunctions;

			mockedVerifySignature.mockResolvedValue(true);
		});

		it('should process webhook with valid signature', async () => {
			mockedVerifySignature.mockResolvedValue(true);

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result).toEqual({
				workflowData: [[testBody]],
			});
			expect(mockedVerifySignature).toHaveBeenCalled();
		});

		it('should reject webhook with invalid signature', async () => {
			mockedVerifySignature.mockResolvedValue(false);

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result).toEqual({
				noWebhookResponse: true,
			});
			expect(mockedVerifySignature).toHaveBeenCalled();
		});

		it('should resolve data when resolveData is true', async () => {
			(mockWebhookFunctions.getNodeParameter as jest.Mock).mockImplementation((param) => {
				if (param === 'resolveData') return true;
				if (param === 'event') return 'appointment.scheduled';
				return undefined;
			});
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				body: { id: 123 },
			});
			mockedAcuitySchedulingApiRequest.mockResolvedValue({ id: 123, name: 'Test Appointment' });

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(mockedAcuitySchedulingApiRequest).toHaveBeenCalledWith('GET', '/appointments/123', {});
			expect(result).toEqual({
				workflowData: [[{ id: 123, name: 'Test Appointment' }]],
			});
		});
	});
});
