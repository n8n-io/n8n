import type { CreateExecutionPayload, TriggerSeatFence } from '@n8n/db';
import { TransactionRunner, WorkflowTriggerSeatRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { ExecutionPersistence } from '@/executions/execution-persistence';

/**
 * The admission gate for seat-held trigger emissions: an execution row may
 * only be created while the emitting holder still owns its seat at the
 * epoch and version it registered with.
 *
 * The check and the insert share one transaction, so there is no window in
 * which a holder whose seat was re-claimed (or whose version moved on) can
 * land an execution. This is the transactional implementation of the
 * admission seam; a future deployment where seats live in their own store
 * replaces it with a check at the engine's admittance gate plus per-event
 * deduplication.
 */
@Service()
export class TriggerSeatAdmissionService {
	constructor(
		private readonly seatRepository: WorkflowTriggerSeatRepository,
		private readonly transactionRunner: TransactionRunner,
		private readonly executionPersistence: ExecutionPersistence,
	) {}

	/**
	 * @returns The created execution's id, or `null` when the fence rejected
	 *   the emission (seat re-claimed, version moved on, or seat deactivated).
	 * @throws DuplicateExecutionError when the payload's deduplication key
	 *   already has an execution — the caller treats that as already-handled.
	 */
	async commitExecutionWithFence(args: {
		payload: CreateExecutionPayload;
		fence: TriggerSeatFence;
	}): Promise<{ executionId: string } | null> {
		const { payload, fence } = args;
		return await this.transactionRunner.run({}, async (ctx) => {
			const held = await this.seatRepository.assertSeatHeld(fence, ctx);
			if (!held) return null;
			const executionId = await this.executionPersistence.create(payload, ctx);
			return { executionId };
		});
	}
}
