import type { JsonValue, StepExecutionRequest } from '@n8n/engine';
import { encodeBufferBody, ExecutionLifecycleHooks } from 'n8n-core';
import type { IBinaryData, IWorkflowBase, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
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
 * Glues the v1 `sendResponse` hook to the v2 execution response channel.
 * Allows the node execution to send a response to the control plane.
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

	additionalData.hooks.addHandler('sendResponse', (response) => {
		const result = respond.send(toJsonPayload(response));
		if (!result.ok) {
			// Fail the node so the caller can see the response error.
			throw result.error;
		}
	});
}

/**
 * A response crosses a process boundary as JSON, so anything without a JSON
 * form fails here rather than arriving silently mangled.
 *
 * A top-level Buffer body is base64-encoded into the envelope
 * which the control plane decodes, the same one Engine v1 queue mode uses.
 * A top-level `{ binaryData }` body with an `id` is plain JSON: the bytes are
 * in the binary data store, which the control plane reads with that id.
 * Nested Buffers and streams are not supported, as in Engine v1 queue mode.
 */
function toJsonPayload(value: unknown): JsonValue {
	assertCarriable(value);

	if (!hasBody(value)) return value as JsonValue;

	if (Buffer.isBuffer(value.body)) {
		// A shallow copy, so a host hook that runs after this one still sees the Buffer.
		return encodeBufferBody({ ...value }) as JsonValue;
	}

	if (isStoredBinaryReference(value.body)) return value as JsonValue;

	assertCarriable(value.body);
	return value as JsonValue;
}

function hasBody(value: unknown): value is { body: unknown } {
	return typeof value === 'object' && value !== null && 'body' in value;
}

/**
 * The body the Respond to Webhook node produces in a stored binary data mode.
 * Without an `id` the bytes are inline in `data`, and the node produces a
 * Buffer for that case instead, so a reference without `id` is refused.
 */
function isStoredBinaryReference(body: unknown): body is { binaryData: IBinaryData } {
	if (!hasBinaryData(body)) return false;

	const { binaryData } = body;
	return (
		typeof binaryData === 'object' &&
		binaryData !== null &&
		'id' in binaryData &&
		typeof binaryData.id === 'string'
	);
}

function hasBinaryData(value: unknown): value is { binaryData: unknown } {
	return typeof value === 'object' && value !== null && 'binaryData' in value;
}

function assertCarriable(value: unknown): void {
	if (Buffer.isBuffer(value)) {
		throw new UserError('Engine v2 cannot send a binary webhook response yet.');
	}

	if (typeof value === 'object' && value !== null) {
		if (typeof (value as { pipe?: unknown }).pipe === 'function') {
			throw new UserError('Engine v2 cannot stream a webhook response body yet.');
		}

		if (hasBinaryData(value)) {
			throw new UserError(
				'Engine v2 cannot send binary data that is not in the binary data store.',
			);
		}
	}
}
