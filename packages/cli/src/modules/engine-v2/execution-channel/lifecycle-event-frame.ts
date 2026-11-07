import type { Logger } from '@n8n/backend-common';
import { lifecycleEventSchema, type LifecycleEvent } from '@n8n/engine';
import { createResultError, createResultOk, toResult, type Result } from '@n8n/utils/result';
import { UnexpectedError } from 'n8n-workflow';

import { type ExecutionChannelCodec, type FrameResult, MAX_FRAME_BYTES } from './execution-channel';

/**
 * The codec of the `lifecycle` topic. Each frame holds one event.
 *
 * Lifecycle events are delivered at most once, so an event that the codec
 * cannot encode has no replacement frame. The sender then publishes nothing.
 */
export function createLifecycleEventCodec(
	logger: Logger,
	maxFrameBytes: number = MAX_FRAME_BYTES,
): ExecutionChannelCodec<LifecycleEvent> {
	return {
		topic: 'lifecycle',
		executionIdOf: (event) => event.executionId,
		serialize: (event) => serializeLifecycleEvent(event, logger, maxFrameBytes),
		deserialize: (frame) => deserializeLifecycleEvent(frame, logger),
	};
}

function serializeLifecycleEvent(
	event: LifecycleEvent,
	logger: Logger,
	maxFrameBytes: number,
): FrameResult {
	const serialized = toResult(() => JSON.stringify(event));
	if (!serialized.ok) {
		return failure(logger, 'Dropped a lifecycle event that could not be serialized', event, {
			error: serialized.error,
		});
	}

	const bytes = Buffer.byteLength(serialized.result);
	if (bytes > maxFrameBytes) {
		// TODO(CET-302): decide what to send for an event over the size limit.
		return failure(logger, 'Dropped a lifecycle event that exceeds the frame size limit', event, {
			bytes,
		});
	}

	return { ok: true, frame: serialized.result };
}

function deserializeLifecycleEvent(frame: string, logger: Logger): Result<LifecycleEvent, Error> {
	const deserialized = toResult<unknown>(() => JSON.parse(frame));
	if (!deserialized.ok) {
		logger.error('Discarding an unreadable lifecycle event', { error: deserialized.error });
		return deserialized;
	}

	const parsed = lifecycleEventSchema.safeParse(deserialized.result);
	if (!parsed.success) {
		logger.error('Discarding a malformed lifecycle event', { details: parsed.error.flatten() });
		return createResultError(parsed.error);
	}

	return createResultOk(parsed.data);
}

function failure(
	logger: Logger,
	message: string,
	event: LifecycleEvent,
	extra: Record<string, unknown>,
): FrameResult {
	const context = { executionId: event.executionId, type: event.type, ...extra };
	logger.warn(message, context);
	return { ok: false, error: new UnexpectedError(message, { extra: context }) };
}
