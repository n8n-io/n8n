import type { IWebhookResponseData, WebhookResponseData } from 'n8n-workflow';

/**
+ * Creates the response for a webhook when the response mode is set to
 * `onReceived`.
 *
 * @param context - The webhook execution context
 * @param responseData - The evaluated `responseData` option of the webhook node
 * @param webhookResultData - The webhook result data that the webhook might have returned when it was ran
 *
 * @returns The response body
 */
export function extractWebhookOnReceivedResponse(
	// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
	responseData: Extract<WebhookResponseData, 'noData'> | string | undefined,
	webhookResultData: IWebhookResponseData,
): unknown {
	// Return response directly and do not wait for the workflow to finish
	if (responseData === 'noData') {
		return undefined;
	}

	if (responseData) {
		return responseData;
	}

	if (webhookResultData.webhookResponse !== undefined) {
		// Data to respond with is given
		return webhookResultData.webhookResponse as unknown;
	}

	return { message: 'Workflow was started' };
}
