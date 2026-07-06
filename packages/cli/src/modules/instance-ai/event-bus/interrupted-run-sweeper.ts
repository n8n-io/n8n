import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { DurableEventLog } from './durable-event-log';
import { InProcessEventBus } from './in-process-event-bus';

/**
 * SKETCH (durable-log RFC, resilience phase): no zombie runs.
 *
 * Invariant 3: every run reaches a terminal state recorded in the log. Today a
 * mid-run crash leaves a `run-start` with no `run-finish` — the UI spins
 * forever and the run is unrecoverable. With the durable log, detection is a
 * query; resolution is one appended fact.
 *
 * Plan (not yet implemented — sized here for phasing):
 *
 * 1. LEASE — active runs get a row (runId, threadId, ownerInstanceId,
 *    heartbeatAt), refreshed by the owning main every N seconds. Replaces the
 *    in-memory-only liveness sweeping in InstanceAiLivenessService for the
 *    cross-main/restart case. (~new table or columns on run start, ~30 lines
 *    in the run lifecycle.)
 *
 * 2. SWEEP — on startup and on an interval, find runs whose log has
 *    `run-start` but no `run-finish` AND whose lease is expired:
 *    a. If a checkpoint exists (per-step or suspension): eligible for
 *       crash-resume — resolve in-flight tool calls as `tool-interrupted`
 *       facts ("effect unverified — verify before retrying", the tool-error
 *       shape) and re-drive the run from the checkpoint via the
 *       suspended-run-restorer machinery (rebuildSuspendedRun already does
 *       agent reconstruction; this generalizes it from 'suspended' to
 *       'running' checkpoints — see RunStateManager.loadForCrashResume).
 *    b. Otherwise: append `run-finish { status: 'interrupted' }` — the fold
 *       renders every in-flight item as interrupted; no walk-and-mutate.
 *
 * 3. CORRECTIONS — re-queue steering facts present in the log but absent from
 *    the resumed checkpoint's message list (keyed by toolCallId).
 */
@Service()
export class InterruptedRunSweeper {
	constructor(
		private readonly logger: Logger,
		private readonly eventLog: DurableEventLog,
		private readonly eventBus: InProcessEventBus,
	) {
		this.logger = this.logger.scoped('instance-ai');
	}

	/** Called from module init (startup) and the pruning interval. */
	async sweep(): Promise<void> {
		// SKETCH: intentionally unimplemented — see the plan above.
		this.logger.debug('Interrupted-run sweep (sketch, not implemented)');
	}
}
