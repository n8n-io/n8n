import { Container } from '@n8n/di';
import get from 'lodash/get';
import { BinaryDataService } from 'n8n-core';
import type { INodeExecutionData, ITaskData, Result, WebhookResponseData } from 'n8n-workflow';
import { BINARY_ENCODING, createResultError, createResultOk, OperationalError } from 'n8n-workflow';
import type { Readable } from 'node:stream';

import type { WebhookExecutionContext } from '@/webhooks/webhook-execution-context';

/** Response that is not a stream */
type StaticResponse = {
	type: 'static';
	body: unknown;
	contentType: string | undefined;
};

type StreamResponse = {
	type: 'stream';
	stream: Readable;
	contentType: string | undefined;
};

/**
+ * Extracts the response for a webhook when the response mode is set to
 * `lastNode`.
 */
export async function extractWebhookLastNodeResponse(
	context: WebhookExecutionContext,
	responseDataType: WebhookResponseData | undefined,
	lastNodeTaskData: ITaskData,
): Promise<Result<StaticResponse | StreamResponse, OperationalError>> {
	if (responseDataType === 'firstEntryJson') {
		return extractFirstEntryJsonFromTaskData(context, lastNodeTaskData);
	}

	if (responseDataType === 'firstEntryBinary') {
		return await extractFirstEntryBinaryFromTaskData(context, lastNodeTaskData);
	}

	if (responseDataType === 'noData') {
		return createResultOk({
			type: 'static',
			body: undefined,
			contentType: undefined,
		});
	}

	// Default to all entries JSON
	return extractAllEntriesJsonFromTaskData(lastNodeTaskData);
}

/**
 * Extracts the JSON data of the first item of the last node
 */
function extractFirstEntryJsonFromTaskData(
	context: WebhookExecutionContext,
	lastNodeTaskData: ITaskData,
): Result<StaticResponse, OperationalError> {
	if (lastNodeTaskData.data!.main[0]![0] === undefined) {
		return createResultError(new OperationalError('No item to return was found'));
	}

	let lastNodeFirstJsonItem: unknown = lastNodeTaskData.data!.main[0]![0].json;

	const responsePropertyName =
		context.evaluateSimpleWebhookDescriptionExpression<string>('responsePropertyName');

	if (responsePropertyName !== undefined) {
		lastNodeFirstJsonItem = get(lastNodeFirstJsonItem, responsePropertyName);
	}

	// User can set the content type of the response and also the headers.
	// The `responseContentType` only applies to `firstEntryJson` mode.
	const responseContentType =
		context.evaluateSimpleWebhookDescriptionExpression<string>('responseContentType');

	return createResultOk({
		type: 'static',
		body: lastNodeFirstJsonItem,
		contentType: responseContentType,
	});
}

/**
 * Extracts the binary data of the first item of the last node
 */
async function extractFirstEntryBinaryFromTaskData(
	context: WebhookExecutionContext,
	lastNodeTaskData: ITaskData,
): Promise<Result<StaticResponse | StreamResponse, OperationalError>> {
	// Return the binary data of the first entry
	const lastNodeFirstJsonItem: INodeExecutionData = lastNodeTaskData.data!.main[0]![0];

	if (lastNodeFirstJsonItem === undefined) {
		return createResultError(new OperationalError('No item was found to return'));
	}

	if (lastNodeFirstJsonItem.binary === undefined) {
		return createResultError(new OperationalError('No binary data was found to return'));
	}

	const responseBinaryPropertyName = context.evaluateSimpleWebhookDescriptionExpression<string>(
		'responseBinaryPropertyName',
		undefined,
		'data',
	);

	if (responseBinaryPropertyName === undefined) {
		return createResultError(new OperationalError("No 'responseBinaryPropertyName' is set"));
	} else if (typeof responseBinaryPropertyName !== 'string') {
		return createResultError(new OperationalError("'responseBinaryPropertyName' is not a string"));
	}

	const binaryData = lastNodeFirstJsonItem.binary[responseBinaryPropertyName];
	if (binaryData === undefined) {
		return createResultError(
			new OperationalError(
				`The binary property '${responseBinaryPropertyName}' which should be returned does not exist`,
			),
		);
	}

	// In binary data's case, the mime type takes precedence over any manually
	// set content type header
	if (binaryData.id) {
		const stream = await Container.get(BinaryDataService).getAsStream(binaryData.id);
		return createResultOk({
			type: 'stream',
			stream,
			contentType: binaryData.mimeType,
		});
	} else {
		return createResultOk({
			type: 'static',
			body: Buffer.from(binaryData.data, BINARY_ENCODING),
			contentType: binaryData.mimeType,
		});
	}
}

/**
 * Extracts the JSON data of all the items of the last node
 */
function extractAllEntriesJsonFromTaskData(
	lastNodeTaskData: ITaskData,
): Result<StaticResponse, OperationalError> {
	const data: unknown[] = [];
	for (const entry of lastNodeTaskData.data!.main[0]!) {
		data.push(entry.json);
	}

	return createResultOk({
		type: 'static',
		body: data,
		// No content-type override in this case. User can set the content-type
		// header if they wish. We default to application/json later on when the
		// response is sent.
		contentType: undefined,
	});
}
