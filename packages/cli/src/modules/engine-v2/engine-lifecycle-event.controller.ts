import { Service } from '@n8n/di';
import { lifecycleEventBatchSchema } from '@n8n/engine';
import type { Request, Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { EngineLifecycleEventPushRelay } from './engine-lifecycle-event-push-relay';

/** Handles `LifecycleEvent` batches from the engine 2.0 data plane. */
@Service()
export class EngineLifecycleEventController {
	constructor(private readonly pushRelay: EngineLifecycleEventPushRelay) {}

	async receiveLifecycleEvents(req: Request, res: Response): Promise<void> {
		const parsed = lifecycleEventBatchSchema.safeParse(req.body);
		// The engine's own schema, so emitter and receiver cannot drift. The reason
		// stays out of the response: only a data plane calls this.
		if (!parsed.success) throw new BadRequestError('Invalid lifecycle event batch');

		// TODO(CAT-2877 follow-up): dispatch the error workflow on
		// `execution:failed` once the failure reason and run data are available.

		// Never throws: a bad event is logged and skipped inside.
		this.pushRelay.relay(parsed.data.events);

		// Re-delivering a batch is harmless: the relay ignores events it has
		// already reported.
		res.status(204).end();
	}
}
