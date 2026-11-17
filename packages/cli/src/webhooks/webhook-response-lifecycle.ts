import { createResultOk } from '@n8n/utils/result';
import type {
	ITaskData,
	IWebhookResponseData,
	WebhookResponseData,
	WebhookResponseMode,
} from 'n8n-workflow';
import { CHAT_TRIGGER_NODE_TYPE } from 'n8n-workflow';

import type { WebhookExecutionContext } from './webhook-execution-context';
import { extractWebhookLastNodeResponse } from './webhook-last-node-response-extractor';
import { extractWebhookOnReceivedResponse } from './webhook-on-received-response-extractor';
import { createStaticResponse, createStreamResponse } from './webhook-response';
import {
	WebhookResponseHeaders,
	type WebhookNodeResponseHeaders,
} from './webhook-response-headers';

export function evaluateWebhookResponseOptions(
	context: WebhookExecutionContext,
	responseMode?: WebhookResponseMode,
) {
	return {
		responseMode:
			responseMode ??
			context.evaluateSimpleWebhookDescriptionExpression<WebhookResponseMode>(
				'responseMode',
				undefined,
				'onReceived',
			)!,
		responseCode: context.evaluateSimpleWebhookDescriptionExpression<number>(
			'responseCode',
			undefined,
			200,
		)!,
		responseData: context.evaluateComplexWebhookDescriptionExpression<WebhookResponseData | string>(
			'responseData',
			undefined,
			'firstEntryJson',
		),
		checkAllMainOutputs: context.workflowStartNode.type === CHAT_TRIGGER_NODE_TYPE,
		responsePropertyName:
			context.evaluateSimpleWebhookDescriptionExpression<string>('responsePropertyName'),
		responseContentType:
			context.evaluateSimpleWebhookDescriptionExpression<string>('responseContentType'),
		responseBinaryPropertyName: context.evaluateSimpleWebhookDescriptionExpression<string>(
			'responseBinaryPropertyName',
			undefined,
			'data',
		),
	};
}

export function evaluateWebhookResponseHeaders(
	context: WebhookExecutionContext,
): WebhookResponseHeaders {
	const headers = new WebhookResponseHeaders();
	if (context.webhookData.webhookDescription.responseHeaders === undefined) return headers;
	const evaluated =
		context.evaluateComplexWebhookDescriptionExpression<WebhookNodeResponseHeaders>(
			'responseHeaders',
		);
	if (evaluated) headers.addFromNodeHeaders(evaluated);
	return headers;
}

export function createWebhookOnReceivedResponse(
	context: WebhookExecutionContext,
	webhookResultData: IWebhookResponseData,
	responseCode: number,
	responseHeaders: WebhookResponseHeaders,
) {
	const responseData = context.evaluateComplexWebhookDescriptionExpression<string>(
		'responseData',
		undefined,
		'firstEntryJson',
	);
	return createStaticResponse(
		extractWebhookOnReceivedResponse(responseData, webhookResultData),
		responseCode,
		responseHeaders,
	);
}

export async function createWebhookLastNodeResponse(
	options: ReturnType<typeof evaluateWebhookResponseOptions>,
	lastNodeTaskData: ITaskData,
	responseHeaders: WebhookResponseHeaders,
) {
	const result = await extractWebhookLastNodeResponse(
		options.responseData,
		lastNodeTaskData,
		options.checkAllMainOutputs,
		options,
	);
	if (!result.ok) return result;
	const response = result.result;
	if (response.contentType) responseHeaders.set('content-type', response.contentType);
	return createResultOk(
		response.type === 'static'
			? createStaticResponse(response.body, options.responseCode, responseHeaders)
			: createStreamResponse(response.stream, options.responseCode, responseHeaders),
	);
}
