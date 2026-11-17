import { UnexpectedError } from '@n8n/errors';
import { Readable } from 'node:stream';
import {
	createWebhookLastNodeResponse,
	createWebhookOnReceivedResponse,
	evaluateWebhookResponseHeaders,
	evaluateWebhookResponseOptions,
	WebhookExecutionContext,
	WebhookResponseHeaders,
} from 'n8n/dist/testing.js';
import { getAdditionalKeys } from 'n8n-core';
import type { IExecuteResponsePromiseData, IN8nHttpFullResponse, INode, IRun } from 'n8n-workflow';
import { getLastExecutedNodeData, WEBHOOK_NODE_TYPE } from 'n8n-workflow';

import { WorkflowTestError } from '../errors';
import { failExecution, type ExecutionContext } from '../execution-context';

export interface WebhookResponse {
	status: number;
	headers: Record<string, string>;
	body: unknown;
}

export interface WebhookCapture {
	options: ReturnType<typeof evaluateWebhookResponseOptions>;
	headers: WebhookResponseHeaders;
	sent?: WebhookResponse;
}

export function captureWebhookResponse(context: ExecutionContext, trigger: INode) {
	if (trigger.type !== WEBHOOK_NODE_TYPE) return;
	const { workflow, additionalData } = context;
	const description = workflow.nodeTypes.getByNameAndVersion(trigger.type, trigger.typeVersion)
		.description.webhooks?.[0];
	if (!description) throw new UnexpectedError('The webhook node has no webhook description');
	const responseContext = new WebhookExecutionContext(
		workflow,
		trigger,
		{
			httpMethod: 'POST',
			node: trigger.name,
			path: '',
			webhookDescription: description,
			workflowId: workflow.id,
			workflowExecuteAdditionalData: additionalData,
		},
		'webhook',
		getAdditionalKeys(additionalData, 'webhook', null),
	);
	const options = evaluateWebhookResponseOptions(responseContext);
	if (options.responseMode === 'streaming') {
		failExecution(
			context,
			new WorkflowTestError(
				'INVALID_OPTION',
				'The test library does not support streaming webhook responses.',
				{
					workflow: context.handle.name,
				},
			),
		);
	}
	const headers = evaluateWebhookResponseHeaders(responseContext);
	const capture: WebhookCapture = { options, headers };
	context.webhook = capture;
	if (options.responseMode === 'onReceived') {
		const response = createWebhookOnReceivedResponse(
			responseContext,
			{},
			options.responseCode,
			headers,
		);
		capture.sent = {
			status: response.code ?? 200,
			headers: headers.toObject(),
			body: structuredClone(response.body),
		};
	}
	context.hooks.addHandler('sendResponse', (response) => {
		if (!capture.sent && isFullResponse(response)) {
			if (Buffer.isBuffer(response.body) || response.body instanceof Readable) {
				failExecution(
					context,
					new WorkflowTestError(
						'BINARY_NOT_SUPPORTED',
						'The webhook responds with binary data. Results hold JSON only.',
						{ workflow: context.handle.name },
					),
				);
			}
			const sentHeaders = WebhookResponseHeaders.fromObject(response.headers);
			capture.sent = {
				status: response.statusCode,
				headers: { ...headers.toObject(), ...sentHeaders.toObject() },
				body: structuredClone(response.body),
			};
		}
	});
}

export async function toWebhookResponse(
	context: ExecutionContext,
	run: IRun,
): Promise<WebhookResponse | undefined> {
	if (!context.webhook) return undefined;
	const { options, headers, sent } = context.webhook;
	if (sent) return structuredClone(sent);
	if (run.data.resultData.error || getLastExecutedNodeData(run)?.error) {
		return { status: 500, headers: {}, body: { message: 'Error in workflow' } };
	}
	if (options.responseMode === 'responseNode') {
		return { status: options.responseCode, headers: headers.toObject(), body: undefined };
	}
	const task = getLastExecutedNodeData(run);
	if (!task) {
		return {
			status: options.responseCode,
			headers: headers.toObject(),
			body: { message: 'Workflow executed successfully but the last node did not return any data' },
		};
	}
	if (options.responseData === 'firstEntryBinary') {
		throw new WorkflowTestError(
			'BINARY_NOT_SUPPORTED',
			'The webhook responds with binary data. Results hold JSON only.',
			{ workflow: context.handle.name },
		);
	}
	const result = await createWebhookLastNodeResponse(options, task, headers);
	if (!result.ok) return { status: 500, headers: {}, body: { message: result.error.message } };
	const response = result.result;
	if ('stream' in response) {
		throw new WorkflowTestError(
			'BINARY_NOT_SUPPORTED',
			'The webhook responds with a stream. Results hold JSON only.',
			{ workflow: context.handle.name },
		);
	}
	return { status: response.code ?? 200, headers: headers.toObject(), body: response.body };
}

function isFullResponse(response: IExecuteResponsePromiseData): response is IN8nHttpFullResponse {
	return (
		typeof response.statusCode === 'number' &&
		typeof response.headers === 'object' &&
		response.headers !== null
	);
}
