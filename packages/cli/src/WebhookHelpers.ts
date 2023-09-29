import type { IDataObject, IExecuteResponsePromiseData } from 'n8n-workflow';
import { BINARY_ENCODING } from 'n8n-workflow';
import * as GenericHelpers from '@/GenericHelpers';

export function encodeWebhookResponse(
	response: IExecuteResponsePromiseData,
): IExecuteResponsePromiseData {
	if (typeof response === 'object' && Buffer.isBuffer(response.body)) {
		response.body = {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'__@N8nEncodedBuffer@__': response.body.toString(BINARY_ENCODING),
		};
	}

	return response;
}

export function decodeWebhookResponse(
	response: IExecuteResponsePromiseData,
): IExecuteResponsePromiseData {
	if (
		typeof response === 'object' &&
		typeof response.body === 'object' &&
		(response.body as IDataObject)['__@N8nEncodedBuffer@__']
	) {
		response.body = Buffer.from(
			(response.body as IDataObject)['__@N8nEncodedBuffer@__'] as string,
			BINARY_ENCODING,
		);
	}

	return response;
}

/**
 * Returns the base URL of the webhooks
 */
export function getWebhookBaseUrl() {
	let urlBaseWebhook = process.env.WEBHOOK_URL ?? GenericHelpers.getBaseUrl();
	if (!urlBaseWebhook.endsWith('/')) {
		urlBaseWebhook += '/';
	}
	return urlBaseWebhook;
}
