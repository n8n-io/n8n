import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { LifecycleEvent } from '@n8n/engine';
import { lifecycleEventBatchSchema } from '@n8n/engine';
import type { Request, Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

/**
 * Handles `LifecycleEvent` batches from the engine 2.0 data plane.
 *
 * Mounted by {@link EngineControlPlaneServer} rather than declared with
 * `@RestController`, because it belongs to that server and not to the editor
 * API.
 */
@Service()
export class EngineStatusController {
	constructor(private readonly logger: Logger) {
		this.logger = this.logger.scoped('engine-v2');
	}

	async receiveLifecycleEvents(req: Request, res: Response): Promise<void> {
		const parsed = lifecycleEventBatchSchema.safeParse(req.body);
		// Validated against the engine's own schema, so the two halves of the wire
		// contract cannot drift. The reason stays out of the response: the only
		// legitimate caller is the data plane, and it cannot act on the detail.
		if (!parsed.success) throw new BadRequestError('Invalid lifecycle event batch');

		// TODO(CAT-2878): map these onto push messages for the editor
		// (`step:completed` -> `nodeExecuteAfter`, `execution:completed`/`failed`
		// -> `executionFinished`) and dispatch the error workflow on
		// `execution:failed`.
		for (const event of parsed.data.events) {
			this.logger.debug(`Engine lifecycle event: ${event.type}`, toLogMetadata(event));
		}

		// Nothing to return, and re-delivering a batch is harmless while this only
		// logs. Real deduplication lands with the consumer (CAT-2878).
		res.status(204).end();
	}
}

/**
 * An event's identifiers, ready to log.
 *
 * `step:completed` carries the step's outputs, which are whatever the workflow
 * processed. Logged as a slot count rather than contents, so a debug log never
 * becomes a copy of a user's execution data.
 */
function toLogMetadata(event: LifecycleEvent): Record<string, unknown> {
	if (event.type !== 'step:completed') return { ...event };

	const { outputs, ...rest } = event;
	return { ...rest, outputSlots: outputs.length };
}
