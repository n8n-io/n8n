import type { Logger } from '@n8n/backend-common';
import {
	lifecycleEventBatchSchema,
	MAX_LIFECYCLE_EVENTS_PER_BATCH,
	type LifecycleEvent,
	type LifecycleEventBatch,
} from '@n8n/engine';
import { createResultError, createResultOk, toResult, type Result } from '@n8n/utils/result';
import { UnexpectedError } from 'n8n-workflow';

import { type ExecutionChannelCodec, type FrameResult, MAX_FRAME_BYTES } from './execution-channel';

/** The bytes of `{"events":[]}`, the frame around the events. */
const FRAME_ENVELOPE_BYTES = Buffer.byteLength(JSON.stringify({ events: [] }));

/**
 * The codec of the `lifecycle` topic. A message is a batch of the events of one
 * execution. Use {@link splitLifecycleEvents} to build batches that fit a frame.
 */
export function createLifecycleEventCodec(
	logger: Logger,
	maxFrameBytes: number = MAX_FRAME_BYTES,
): ExecutionChannelCodec<LifecycleEventBatch> {
	return {
		topic: 'lifecycle',
		executionIdOf: (batch) => batch.events[0]?.executionId ?? '',
		serialize: (batch) => serializeLifecycleEvents(batch, logger, maxFrameBytes),
		deserialize: (frame) => deserializeLifecycleEvents(frame, logger),
	};
}

/**
 * Splits the events of one execution into batches whose frames fit the frame
 * size limit and the batch size limit.
 *
 * An event that is larger than the limit by itself is dropped. Lifecycle
 * events are delivered at most once, so the receiver must tolerate a gap.
 */
export function splitLifecycleEvents(
	events: LifecycleEvent[],
	logger: Logger,
	maxFrameBytes: number = MAX_FRAME_BYTES,
): LifecycleEventBatch[] {
	const batches: LifecycleEventBatch[] = [];
	let batch: LifecycleEvent[] = [];
	let frameBytes = FRAME_ENVELOPE_BYTES;

	for (const event of events) {
		// TODO(CET-302): measure without serializing the events a second time in the codec.
		const serialized = toResult(() => JSON.stringify(event));
		if (!serialized.ok) {
			logger.warn('Dropped a lifecycle event that could not be serialized', {
				executionId: event.executionId,
				type: event.type,
				error: serialized.error,
			});
			continue;
		}

		const eventBytes = Buffer.byteLength(serialized.result);
		if (FRAME_ENVELOPE_BYTES + eventBytes > maxFrameBytes) {
			// TODO(CET-302): decide what to send for an event over the size limit.
			logger.warn('Dropped a lifecycle event that exceeds the frame size limit', {
				executionId: event.executionId,
				type: event.type,
				bytes: eventBytes,
			});
			continue;
		}

		const separatorBytes = batch.length > 0 ? 1 : 0;
		if (
			frameBytes + separatorBytes + eventBytes > maxFrameBytes ||
			batch.length >= MAX_LIFECYCLE_EVENTS_PER_BATCH
		) {
			batches.push({ events: batch });
			batch = [];
			frameBytes = FRAME_ENVELOPE_BYTES;
		}

		frameBytes += (batch.length > 0 ? 1 : 0) + eventBytes;
		batch.push(event);
	}

	if (batch.length > 0) batches.push({ events: batch });

	return batches;
}

/**
 * Has no replacement frame for a batch that it cannot deliver, so a failed
 * result has no frame and the sender publishes nothing.
 */
function serializeLifecycleEvents(
	batch: LifecycleEventBatch,
	logger: Logger,
	maxFrameBytes: number,
): FrameResult {
	const executionId = batch.events[0]?.executionId;
	if (batch.events.length === 0 || batch.events.length > MAX_LIFECYCLE_EVENTS_PER_BATCH) {
		return failure(logger, 'A lifecycle event batch has no events or too many events', {
			executionId,
			count: batch.events.length,
		});
	}

	if (batch.events.some((event) => event.executionId !== executionId)) {
		return failure(logger, 'A lifecycle event batch must hold the events of one execution', {
			executionId,
		});
	}

	const serialized = toResult(() => JSON.stringify(batch));
	if (!serialized.ok) {
		return failure(logger, 'Could not serialize a lifecycle event batch', {
			executionId,
			error: serialized.error,
		});
	}

	if (Buffer.byteLength(serialized.result) > maxFrameBytes) {
		return failure(logger, 'A lifecycle event batch exceeds the frame size limit', {
			executionId,
		});
	}

	return { ok: true, frame: serialized.result };
}

/**
 * A publisher sends only the events of the execution that the channel belongs
 * to, so a frame with events of more than one execution is rejected.
 */
function deserializeLifecycleEvents(
	frame: string,
	logger: Logger,
): Result<LifecycleEventBatch, Error> {
	const deserialized = toResult<unknown>(() => JSON.parse(frame));
	if (!deserialized.ok) {
		logger.error('Discarding an unreadable lifecycle event frame', { error: deserialized.error });
		return deserialized;
	}

	const parsed = lifecycleEventBatchSchema.safeParse(deserialized.result);
	if (!parsed.success) {
		logger.error('Discarding a malformed lifecycle event frame', {
			details: parsed.error.flatten(),
		});
		return createResultError(parsed.error);
	}

	const [first] = parsed.data.events;
	if (parsed.data.events.some((event) => event.executionId !== first.executionId)) {
		logger.error('Discarding a lifecycle event frame with events of more than one execution', {
			executionId: first.executionId,
		});
		return createResultError(
			new UnexpectedError('The lifecycle event frame has events of more than one execution'),
		);
	}

	return createResultOk(parsed.data);
}

function failure(logger: Logger, message: string, extra: Record<string, unknown>): FrameResult {
	logger.warn(message, extra);
	return { ok: false, error: new UnexpectedError(message, { extra }) };
}
