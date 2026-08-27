import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { LifecycleEvent } from '@n8n/engine';
import { lifecycleEventBatchSchema } from '@n8n/engine';
import type { Request, Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

/** Handles `LifecycleEvent` batches from the engine 2.0 data plane. */
@Service()
export class EngineLifecycleEventController {
	constructor(private readonly logger: Logger) {
		this.logger = this.logger.scoped('engine-v2');
	}

	async receiveLifecycleEvents(req: Request, res: Response): Promise<void> {
		const parsed = lifecycleEventBatchSchema.safeParse(req.body);
		// The engine's own schema, so emitter and receiver cannot drift. The reason
		// stays out of the response: only a data plane calls this.
		if (!parsed.success) throw new BadRequestError('Invalid lifecycle event batch');

		// TODO(CAT-2878): forward these to the editor and dispatch the error workflow.
		for (const event of parsed.data.events) {
			this.logger.debug(`Engine lifecycle event: ${event.type}`, toLogMetadata(event));
		}

		// Nothing to return, and re-delivery is harmless while this only logs.
		res.status(204).end();
	}
}

/**
 * An event's identifiers, ready to log. Outputs become a slot count, so a log
 * never becomes a copy of a user's execution data.
 */
function toLogMetadata(event: LifecycleEvent): Record<string, unknown> {
	if (event.type !== 'step:completed') return { ...event };

	const { outputs, ...rest } = event;
	return { ...rest, outputSlots: outputs.length };
}
