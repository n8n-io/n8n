import type { JsonValue, StepExecutionRequest } from '@n8n/engine';
import { ExecutionLifecycleHooks } from 'n8n-core';
import type { IWorkflowBase, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

import { toV1ExecuteMode } from './v1-adapters';

/**
 * `ExecutionLifecycleHooks` takes a workflow, but `sendResponse` and `sendChunk`
 * never read one, and this layer holds a `Workflow` instance rather than the
 * `IWorkflowBase` the constructor wants.
 */
function stubWorkflow(id: string): IWorkflowBase {
	const now = new Date();
	return {
		id,
		name: '',
		active: false,
		isArchived: false,
		activeVersionId: null,
		createdAt: now,
		updatedAt: now,
		nodes: [],
		connections: {},
	};
}

/**
 * Lets a v1 node answer the caller that started the execution.
 *
 * `sendResponse` and `sendChunk` are how a v1 node reaches past its own output
 * — the Respond to Webhook node calls them from inside `execute()`. They run
 * through `additionalData.hooks`, so this is where that v1 concept meets the
 * engine's response channel.
 *
 * Attached for every step. A step whose node never calls them costs two empty
 * arrays, and the emitter reaches nobody unless the host supplied a channel.
 */
export function attachResponseHooks(
	additionalData: IWorkflowExecuteAdditionalData,
	request: StepExecutionRequest,
): void {
	const { context, respond } = request;
	additionalData.hooks ??= new ExecutionLifecycleHooks(
		toV1ExecuteMode(context),
		context.executionId,
		stubWorkflow(context.workflowId),
	);

	additionalData.hooks.addHandler('sendResponse', (response) =>
		respond.send(toJsonPayload(response)),
	);

	// Only when the caller waits for a stream. `isStreaming()` reads both this
	// flag and the handler, and a node that streams never calls `sendResponse`,
	// so setting it unconditionally would break the `responseNode` mode.
	if (context.callerContext.streamingEnabled === true) {
		additionalData.streamingEnabled = true;
		additionalData.hooks.addHandler('sendChunk', (chunk) =>
			respond.chunk(toJsonPayload(chunk)),
		);
	}
}

/**
 * A response crosses a process boundary as JSON, so anything without a JSON
 * form fails here rather than arriving silently mangled.
 */
function toJsonPayload(value: unknown): JsonValue {
	assertCarriable(value);

	// Match Engine 1 queue mode. Nested Buffers and streams are not supported.
	if (typeof value === 'object' && value !== null && 'body' in value) {
		assertCarriable(value.body);
	}

	return value as JsonValue;
}

function assertCarriable(value: unknown): void {
	if (Buffer.isBuffer(value)) {
		throw new UserError('Engine 2.0 cannot send a binary webhook response yet.');
	}

	if (typeof value === 'object' && value !== null) {
		if (typeof (value as { pipe?: unknown }).pipe === 'function') {
			throw new UserError('Engine 2.0 cannot stream a webhook response body yet.');
		}

		if ('binaryData' in value) {
			throw new UserError('Engine 2.0 cannot send a binary webhook response yet.');
		}
	}
}
