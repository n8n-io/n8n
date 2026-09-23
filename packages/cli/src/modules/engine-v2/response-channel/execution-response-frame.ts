import type { Logger } from '@n8n/backend-common';
import {
	executionResponseSchema,
	type ExecutionResponse,
	type UndeliverableMessage,
} from '@n8n/engine';
import { toResult } from '@n8n/utils/result';
import { UnexpectedError } from 'n8n-workflow';

/** A response channel must be able to carry every frame this module produces. */
const MAX_FRAME_BYTES = 5 * 1024 * 1024;

export type ExecutionResponseFrame =
	| { ok: true; frame: string }
	| { ok: false; frame: string; error: Error };

export function serializeExecutionResponse(
	response: ExecutionResponse,
	logger: Logger,
	maxFrameBytes: number = MAX_FRAME_BYTES,
): ExecutionResponseFrame {
	const serialized = toResult(() => JSON.stringify(response));
	if (!serialized.ok) {
		logger.warn('Could not serialize an execution response', {
			executionId: response.executionId,
			type: response.type,
			error: serialized.error,
		});
		return undeliverableFrame(response.executionId, {
			code: 'RESPONSE_SERIALIZATION_FAILED',
			message: 'The execution response could not be serialized.',
		});
	}

	if (Buffer.byteLength(serialized.result) > maxFrameBytes) {
		logger.warn('Execution response exceeds the frame size limit', {
			executionId: response.executionId,
			type: response.type,
		});
		return undeliverableFrame(response.executionId, {
			code: 'RESPONSE_TOO_LARGE',
			message: `The execution response exceeds the maximum size of ${maxFrameBytes} bytes.`,
		});
	}

	return { ok: true, frame: serialized.result };
}

export function deserializeExecutionResponse(
	frame: string,
	logger: Logger,
): ExecutionResponse | undefined {
	try {
		const parsed = executionResponseSchema.safeParse(JSON.parse(frame));
		if (!parsed.success) {
			logger.error('Discarding a malformed execution response', {
				details: parsed.error.flatten(),
			});
			return undefined;
		}

		return parsed.data;
	} catch (error) {
		logger.error('Discarding an unreadable execution response', { error });
		return undefined;
	}
}

function undeliverableFrame(
	executionId: string,
	error: UndeliverableMessage['error'],
): ExecutionResponseFrame {
	const frame = JSON.stringify({
		type: 'undeliverable',
		executionId,
		error,
	} satisfies UndeliverableMessage);

	return {
		ok: false,
		frame,
		error: new UnexpectedError(error.message, { extra: { code: error.code } }),
	};
}
