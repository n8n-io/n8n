import type { Logger } from '@n8n/backend-common';
import {
	executionResponseSchema,
	type ExecutionResponse,
	type UndeliverableMessage,
} from '@n8n/engine';
import { createResultError, createResultOk, toResult, type Result } from '@n8n/utils/result';
import { isRecord } from '@n8n/utils/is-record';
import { UnexpectedError } from 'n8n-workflow';

import { filterEngineTraceHeaders } from '../engine-tracing';

/** A response channel must be able to carry every frame this module produces. */
const MAX_FRAME_BYTES = 5 * 1024 * 1024;

export type FrameResult = { ok: true; frame: string } | { ok: false; frame: string; error: Error };

type ExecutionResponseFrame = {
	response: ExecutionResponse;
	traceHeaders: Record<string, string>;
};

export function serializeExecutionResponse(
	response: ExecutionResponse,
	logger: Logger,
	maxFrameBytes: number = MAX_FRAME_BYTES,
	traceHeaders: Record<string, string> = {},
): FrameResult {
	const carrier = filterEngineTraceHeaders(traceHeaders);
	const withTrace = (message: ExecutionResponse) =>
		Object.keys(carrier).length > 0 ? { ...message, traceContext: carrier } : message;
	const serialized = toResult(() => JSON.stringify(withTrace(response)));
	if (!serialized.ok) {
		logger.warn('Could not serialize an execution response', {
			executionId: response.executionId,
			type: response.type,
			error: serialized.error,
		});
		return undeliverableFrame(
			response.executionId,
			{
				code: 'RESPONSE_SERIALIZATION_FAILED',
				message: 'The execution response could not be serialized.',
			},
			carrier,
			maxFrameBytes,
		);
	}

	if (Buffer.byteLength(serialized.result) > maxFrameBytes) {
		logger.warn('Execution response exceeds the frame size limit', {
			executionId: response.executionId,
			type: response.type,
		});
		return undeliverableFrame(
			response.executionId,
			{
				code: 'RESPONSE_TOO_LARGE',
				message: `The execution response exceeds the maximum size of ${maxFrameBytes} bytes.`,
			},
			carrier,
			maxFrameBytes,
		);
	}

	return { ok: true, frame: serialized.result };
}

export function deserializeExecutionResponse(
	frame: string,
	logger: Logger,
): Result<ExecutionResponse, Error> {
	const result = deserializeExecutionResponseFrame(frame, logger);
	return result.ok ? createResultOk(result.result.response) : result;
}

export function deserializeExecutionResponseFrame(
	frame: string,
	logger: Logger,
): Result<ExecutionResponseFrame, Error> {
	const deserialized = toResult<unknown>(() => JSON.parse(frame));
	if (!deserialized.ok) {
		logger.error('Discarding an unreadable execution response', { error: deserialized.error });
		return deserialized;
	}

	const parsed = executionResponseSchema.safeParse(deserialized.result);
	if (!parsed.success) {
		logger.error('Discarding a malformed execution response', {
			details: parsed.error.flatten(),
		});
		return createResultError(parsed.error);
	}

	const metadata = isRecord(deserialized.result) ? deserialized.result.traceContext : undefined;
	return createResultOk({
		response: parsed.data,
		traceHeaders: isRecord(metadata) ? filterEngineTraceHeaders(metadata) : {},
	});
}

function undeliverableFrame(
	executionId: string,
	error: UndeliverableMessage['error'],
	traceHeaders: Record<string, string>,
	maxFrameBytes: number,
): FrameResult {
	const response = {
		type: 'undeliverable',
		executionId,
		error,
	} satisfies UndeliverableMessage;
	const plainFrame = JSON.stringify(response);
	const tracedFrame =
		Object.keys(traceHeaders).length > 0
			? JSON.stringify({ ...response, traceContext: traceHeaders })
			: plainFrame;
	const frame = Buffer.byteLength(tracedFrame) <= maxFrameBytes ? tracedFrame : plainFrame;

	return {
		ok: false,
		frame,
		error: new UnexpectedError(error.message, { extra: { code: error.code } }),
	};
}
