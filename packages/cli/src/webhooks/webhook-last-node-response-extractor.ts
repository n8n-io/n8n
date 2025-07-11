import { Container } from '@n8n/di';
import get from 'lodash/get';
import { BinaryDataService } from 'n8n-core';
import type {
	INode,
	INodeExecutionData,
	ITaskData,
	IWebhookData,
	IWorkflowDataProxyAdditionalKeys,
	Result,
	WebhookResponseData,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { BINARY_ENCODING, createResultError, createResultOk, OperationalError } from 'n8n-workflow';
import type { Readable } from 'node:stream';

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
	responseDataType: WebhookResponseData | undefined,
	lastNodeRunData: ITaskData,
	workflow: Workflow,
	workflowStartNode: INode,
	webhookData: IWebhookData,
	executionMode: WorkflowExecuteMode,
	additionalKeys: IWorkflowDataProxyAdditionalKeys,
): Promise<Result<StaticResponse | StreamResponse, OperationalError>> {
	if (responseDataType === 'firstEntryJson') {
		return extractFirstEntryJsonFromRunData(
			lastNodeRunData,
			workflow,
			workflowStartNode,
			webhookData,
			executionMode,
			additionalKeys,
		);
	}

	if (responseDataType === 'firstEntryBinary') {
		return await extractFirstEntryBinaryFromRunData(
			lastNodeRunData,
			workflow,
			workflowStartNode,
			webhookData,
			executionMode,
			additionalKeys,
		);
	}

	if (responseDataType === 'noData') {
		return createResultOk({
			type: 'static',
			body: undefined,
			contentType: undefined,
		});
	}

	// Default to all entries JSON
	return extractAllEntriesJsonFromRunData(lastNodeRunData);
}

/**
 * Extracts the JSON data of the first item of the last node
 */
function extractFirstEntryJsonFromRunData(
	lastNodeRunData: ITaskData,
	workflow: Workflow,
	workflowStartNode: INode,
	webhookData: IWebhookData,
	executionMode: WorkflowExecuteMode,
	additionalKeys: IWorkflowDataProxyAdditionalKeys,
): Result<StaticResponse, OperationalError> {
	if (lastNodeRunData.data!.main[0]![0] === undefined) {
		return createResultError(new OperationalError('No item to return was found'));
	}

	let lastNodeFirstJsonItem: unknown = lastNodeRunData.data!.main[0]![0].json;

	const responsePropertyName = workflow.expression.getSimpleParameterValue(
		workflowStartNode,
		webhookData.webhookDescription.responsePropertyName,
		executionMode,
		additionalKeys,
		undefined,
		undefined,
	) as string | undefined;

	if (responsePropertyName !== undefined) {
		lastNodeFirstJsonItem = get(lastNodeFirstJsonItem, responsePropertyName);
	}

	// User can set the content type of the response and also the headers.
	// The `responseContentType` only applies to `firstEntryJson` mode.
	const responseContentType = workflow.expression.getSimpleParameterValue(
		workflowStartNode,
		webhookData.webhookDescription.responseContentType,
		executionMode,
		additionalKeys,
		undefined,
		undefined,
	) as string | undefined;

	return createResultOk({
		type: 'static',
		body: lastNodeFirstJsonItem,
		contentType: responseContentType,
	});
}

/**
 * Extracts the binary data of the first item of the last node
 */
async function extractFirstEntryBinaryFromRunData(
	lastNodeRunData: ITaskData,
	workflow: Workflow,
	workflowStartNode: INode,
	webhookData: IWebhookData,
	executionMode: WorkflowExecuteMode,
	additionalKeys: IWorkflowDataProxyAdditionalKeys,
): Promise<Result<StaticResponse | StreamResponse, OperationalError>> {
	// Return the binary data of the first entry
	const lastNodeFirstJsonItem: INodeExecutionData = lastNodeRunData.data!.main[0]![0];

	if (lastNodeFirstJsonItem === undefined) {
		return createResultError(new OperationalError('No item was found to return'));
	}

	if (lastNodeFirstJsonItem.binary === undefined) {
		return createResultError(new OperationalError('No binary data was found to return'));
	}

	const responseBinaryPropertyName = workflow.expression.getSimpleParameterValue(
		workflowStartNode,
		webhookData.webhookDescription.responseBinaryPropertyName,
		executionMode,
		additionalKeys,
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
function extractAllEntriesJsonFromRunData(
	lastNodeRunData: ITaskData,
): Result<StaticResponse, OperationalError> {
	const data: unknown[] = [];
	for (const entry of lastNodeRunData.data!.main[0]!) {
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
