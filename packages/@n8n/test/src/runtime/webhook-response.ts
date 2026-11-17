import { isRecord } from '@n8n/utils/is-record';
import get from 'lodash/get';
import { getAdditionalKeys } from 'n8n-core';
import type {
	IDataObject,
	IExecuteResponsePromiseData,
	IN8nHttpFullResponse,
	INode,
	IRun,
	ITaskData,
	IWebhookDescription,
} from 'n8n-workflow';
import {
	getLastExecutedNodeData,
	resolveWebhookDescriptionField,
	WEBHOOK_NODE_TYPE,
} from 'n8n-workflow';

import { WorkflowTestError } from '../errors';
import type { ExecutionContext } from '../execution-context';

export interface WebhookResponse {
	status: number;
	headers: Record<string, string>;
	body: unknown;
}

export interface WebhookCapture {
	trigger: INode;
	sent?: IN8nHttpFullResponse;
}

interface ResponseOptions {
	mode: unknown;
	status: number;
	data: unknown;
	headers: Record<string, string>;
	propertyName: unknown;
	contentType: unknown;
}

export function captureWebhookResponse(context: ExecutionContext, trigger: INode) {
	if (trigger.type !== WEBHOOK_NODE_TYPE) return;
	const capture: WebhookCapture = { trigger };
	context.webhook = capture;
	context.hooks.addHandler('sendResponse', (response) => {
		if (!capture.sent && isFullResponse(response)) capture.sent = response;
	});
}

export function toWebhookResponse(
	context: ExecutionContext,
	run: IRun,
): WebhookResponse | undefined {
	if (!context.webhook) return undefined;
	const { trigger, sent } = context.webhook;
	const options = readResponseOptions(context, trigger, run);

	if (options.mode === 'onReceived') return respond(options, onReceivedBody(options.data));
	if (sent) return fromSentResponse(options, sent);
	if (failed(run)) return { status: 500, headers: {}, body: { message: 'Error in workflow' } };
	if (options.mode === 'responseNode') return respond(options, undefined);
	return fromLastNode(context, options, run);
}

function isFullResponse(response: IExecuteResponsePromiseData): response is IN8nHttpFullResponse {
	return (
		typeof response.statusCode === 'number' &&
		typeof response.headers === 'object' &&
		response.headers !== null
	);
}

function failed(run: IRun) {
	return run.data.resultData.error !== undefined || getLastExecutedNodeData(run)?.error;
}

function respond({ status, headers }: ResponseOptions, body: unknown): WebhookResponse {
	return { status, headers, body };
}

function onReceivedBody(data: unknown) {
	if (data === 'noData') return undefined;
	if (data) return data;
	return { message: 'Workflow was started' };
}

function fromSentResponse(options: ResponseOptions, sent: IN8nHttpFullResponse): WebhookResponse {
	return {
		status: sent.statusCode,
		headers: { ...options.headers, ...toHeaders(sent.headers) },
		body: sent.body,
	};
}

function fromLastNode(
	context: ExecutionContext,
	options: ResponseOptions,
	run: IRun,
): WebhookResponse {
	const task = getLastExecutedNodeData(run);
	if (!task) {
		return respond(options, {
			message: 'Workflow executed successfully but the last node did not return any data',
		});
	}

	if (options.data === 'noData') return respond(options, undefined);
	if (options.data === 'firstEntryBinary') {
		throw new WorkflowTestError(
			'BINARY_NOT_SUPPORTED',
			'The webhook responds with binary data. Results hold JSON only.',
			{ workflow: context.handle.name },
		);
	}
	if (options.data === 'allEntries') {
		return respond(
			options,
			firstOutput(task).map((item) => item.json),
		);
	}
	return fromFirstEntry(options, task);
}

function fromFirstEntry(options: ResponseOptions, task: ITaskData): WebhookResponse {
	const [first] = firstOutput(task);
	if (!first) return { status: 500, headers: {}, body: { message: 'No item to return was found' } };

	const headers = { ...options.headers };
	if (typeof options.contentType === 'string') headers['content-type'] = options.contentType;
	const body =
		typeof options.propertyName === 'string' ? get(first.json, options.propertyName) : first.json;
	return { status: options.status, headers, body };
}

function firstOutput(task: ITaskData) {
	return task.data?.main[0] ?? [];
}

function readResponseOptions(
	context: ExecutionContext,
	trigger: INode,
	run: IRun,
): ResponseOptions {
	const { workflow, additionalData } = context;
	const node = workflow.getNode(trigger.name) ?? trigger;
	const description = workflow.nodeTypes.getByNameAndVersion(node.type, node.typeVersion)
		.description.webhooks?.[0];
	const additionalKeys = getAdditionalKeys(additionalData, 'webhook', run.data);

	const read = (field: string, fallback?: string | number) => {
		if (!description) return fallback;
		const native = resolveWebhookDescriptionField(node, description, field);
		if (native.resolved) return native.value;
		return evaluate(context, node, description, field, additionalKeys, fallback);
	};

	const status = read('responseCode', 200);
	return {
		mode: read('responseMode', 'onReceived'),
		status: typeof status === 'number' ? status : 200,
		data: read('responseData', 'firstEntryJson'),
		headers: toHeaderEntries(read('responseHeaders')),
		propertyName: read('responsePropertyName'),
		contentType: read('responseContentType'),
	};
}

function evaluate(
	{ workflow }: ExecutionContext,
	node: INode,
	description: IWebhookDescription,
	field: string,
	additionalKeys: ReturnType<typeof getAdditionalKeys>,
	fallback?: string | number,
) {
	const value = description[field];
	if (value === undefined) return fallback;
	return workflow.expression.getComplexParameterValue(
		node,
		value,
		'webhook',
		additionalKeys,
		undefined,
		fallback,
	);
}

function toHeaderEntries(value: unknown): Record<string, string> {
	if (!isRecord(value) || !Array.isArray(value.entries)) return {};
	return Object.fromEntries(
		value.entries.flatMap((entry: unknown) =>
			isRecord(entry) && typeof entry.name === 'string' ? toHeader(entry.name, entry.value) : [],
		),
	);
}

function toHeaders(headers: IDataObject): Record<string, string> {
	return Object.fromEntries(
		Object.entries(headers).flatMap(([name, value]) => toHeader(name, value)),
	);
}

function toHeader(name: string, value: unknown): Array<[string, string]> {
	if (typeof value === 'string') return [[name.toLowerCase(), value]];
	if (typeof value === 'number' || typeof value === 'boolean')
		return [[name.toLowerCase(), String(value)]];
	return [];
}
