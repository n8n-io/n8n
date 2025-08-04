'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const webhook_on_received_response_extractor_1 = require('@/webhooks/webhook-on-received-response-extractor');
describe('extractWebhookOnReceivedResponse', () => {
	const webhookResultData = (0, jest_mock_extended_1.mock)();
	beforeEach(() => {
		jest.resetAllMocks();
	});
	test('should return response with no data when responseData is "noData"', () => {
		const callbackData = (0,
		webhook_on_received_response_extractor_1.extractWebhookOnReceivedResponse)(
			'noData',
			webhookResultData,
		);
		expect(callbackData).toEqual(undefined);
	});
	test('should return response with responseData when it is defined', () => {
		const responseData = JSON.stringify({ foo: 'bar' });
		const callbackData = (0,
		webhook_on_received_response_extractor_1.extractWebhookOnReceivedResponse)(
			responseData,
			webhookResultData,
		);
		expect(callbackData).toEqual(responseData);
	});
	test('should return response with webhookResponse when responseData is falsy but webhookResponse exists', () => {
		const webhookResponse = { success: true };
		webhookResultData.webhookResponse = webhookResponse;
		const callbackData = (0,
		webhook_on_received_response_extractor_1.extractWebhookOnReceivedResponse)(
			undefined,
			webhookResultData,
		);
		expect(callbackData).toEqual(webhookResponse);
	});
	test('should return default response message when responseData and webhookResponse are falsy', () => {
		webhookResultData.webhookResponse = undefined;
		const callbackData = (0,
		webhook_on_received_response_extractor_1.extractWebhookOnReceivedResponse)(
			undefined,
			webhookResultData,
		);
		expect(callbackData).toEqual({ message: 'Workflow was started' });
	});
});
//# sourceMappingURL=webhook-on-received-response-extractor.test.js.map
