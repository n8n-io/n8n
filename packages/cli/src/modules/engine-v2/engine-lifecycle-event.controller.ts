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
		// `execution:failed`. It needs the failure reason and the run data, neither
		// of which is on the lifecycle event wire.

		// Never throws: one bad update is logged and skipped inside.
		this.pushRelay.relay(parsed.data.events);

		// Nothing to return, and re-delivering a batch is harmless: the relay
		// ignores a step run it has already reported and an execution it has
		// already finished.
		res.status(204).end();
	}
}
