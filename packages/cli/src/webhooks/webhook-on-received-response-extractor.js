'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.extractWebhookOnReceivedResponse = extractWebhookOnReceivedResponse;
function extractWebhookOnReceivedResponse(responseData, webhookResultData) {
	if (responseData === 'noData') {
		return undefined;
	}
	if (responseData) {
		return responseData;
	}
	if (webhookResultData.webhookResponse !== undefined) {
		return webhookResultData.webhookResponse;
	}
	return { message: 'Workflow was started' };
}
//# sourceMappingURL=webhook-on-received-response-extractor.js.map
