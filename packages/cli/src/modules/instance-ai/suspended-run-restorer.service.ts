import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import {
	orchestratorAgentId,
	type ConfirmationData,
	type RunStateRegistry,
	type SuspendedRunState,
} from '@n8n/instance-ai';
import { UserError } from 'n8n-workflow';

import type { InstanceAiPendingConfirmation } from './entities/instance-ai-pending-confirmation.entity';
import type { InProcessEventBus } from './event-bus/in-process-event-bus';
import type { InstanceAiPendingConfirmationRepository } from './repositories/instance-ai-pending-confirmation.repository';
import type { DbSnapshotStorage } from './storage/db-snapshot-storage';

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/** A claimed pending-confirmation row, regardless of whether it can be resumed. */
type ClaimedOrphan = InstanceAiPendingConfirmation;

/** A pending-confirmation orphan that's already passed the `canResumeOrphan`
 *  predicate — i.e. has the SDK-side pointers (`toolCallId`, `checkpointKey`)
 *  needed to rebuild a suspended run from the checkpoint blob. */
export type ResumableOrphan = ClaimedOrphan & {
	toolCallId: string;
	checkpointKey: string;
};

/** Result of rebuilding a suspended run from a persisted checkpoint. Each
 *  failure variant corresponds to one rebuild step the caller can log
 *  distinctly; `ready` carries the fully-assembled state for
 *  `runState.suspendRun`. */
export type RebuildSuspendedRunOutcome =
	| { kind: 'ready'; state: SuspendedRunState<User> }
	| { kind: 'no-user' }
	| { kind: 'no-checkpoint'; error?: unknown }
	| { kind: 'env-failure'; error: unknown }
	| { kind: 'agent-failure'; error: unknown };

/**
 * The agent-machinery operations the restorer can't own itself — they live in
 * `InstanceAiService` because they build and drive the live orchestrator
 * (execution environment, agent, resumed stream) and are shared with the live
 * confirmation path. This is the restorer's only back-reference into that
 * service, kept deliberately to these two steps.
 */
export interface SuspendedRunRebuilder {
	/** Reconstruct the in-memory pieces (user, agent, execution environment)
	 *  for a checkpoint-backed orphan, packaged for `runState.suspendRun`. */
	rebuildSuspendedRun(orphan: ResumableOrphan): Promise<RebuildSuspendedRunOutcome>;
	/** Activate + drive the resumed orchestrator stream for a run already
	 *  present in `runState` as a `SuspendedRunState`. */
	resumeSuspendedRun(
		requestingUserId: string,
		requestId: string,
		data: ConfirmationData,
	): Promise<boolean>;
}

/** The slice of the pending-confirmation repository the restorer reads from. */
export type OrphanConfirmationStore = Pick<InstanceAiPendingConfirmationRepository, 'claim'>;

/** The slice of the run-state registry the restorer writes to. */
export type SuspendedRunStateRegistry = Pick<RunStateRegistry<User>, 'suspendRun'>;

/** The slice of snapshot storage the restorer uses to terminalise a snapshot. */
export type RunSnapshotCanceller = Pick<DbSnapshotStorage, 'markRunCancelled'>;

/** The slice of the event bus the restorer uses to drop a stale client card. */
export type RunFinishEventPublisher = Pick<InProcessEventBus, 'publish'>;

export interface SuspendedRunRestorerOptions {
	logger: Logger;
	pendingConfirmationRepo: OrphanConfirmationStore;
	runState: SuspendedRunStateRegistry;
	dbSnapshotStorage: RunSnapshotCanceller;
	eventBus: RunFinishEventPublisher;
	rebuilder: SuspendedRunRebuilder;
}

/**
 * Owns the restart-recovery flow for suspended Instance AI runs: claim a
 * confirmation orphaned by a process restart, decide whether it can resume,
 * and either drive it back to life through the checkpoint or terminalise it
 * cleanly. Extracted from `InstanceAiService` (INS-393) so that the recovery
 * policy + bookkeeping live in one cohesive place; only the two heavy
 * agent-machinery steps (rebuild + resume) are delegated back via
 * `SuspendedRunRebuilder`.
 *
 * Constructed programmatically (not a `@Service`) — mirroring
 * `InstanceAiLivenessService` — taking only the narrow capability interfaces it
 * actually uses.
 */
export class SuspendedRunRestorer {
	private readonly logger: Logger;

	private readonly pendingConfirmationRepo: OrphanConfirmationStore;

	private readonly runState: SuspendedRunStateRegistry;

	private readonly dbSnapshotStorage: RunSnapshotCanceller;

	private readonly eventBus: RunFinishEventPublisher;

	private readonly rebuilder: SuspendedRunRebuilder;

	constructor(options: SuspendedRunRestorerOptions) {
		this.logger = options.logger;
		this.pendingConfirmationRepo = options.pendingConfirmationRepo;
		this.runState = options.runState;
		this.dbSnapshotStorage = options.dbSnapshotStorage;
		this.eventBus = options.eventBus;
		this.rebuilder = options.rebuilder;
	}

	/**
	 * Last-resort resolution path: the in-memory state is gone, but a persisted
	 * index row may still exist from before a process restart. For
	 * `suspended`-kind rows we rebuild the agent from the DB-backed checkpoint
	 * and resume; for `inline`-kind (no checkpoint, just an in-process Promise
	 * that died with the previous process) or any rebuild failure we publish a
	 * terminal `run-finish` and surface a clear UserError so the client doesn't
	 * sit on a stale confirmation card.
	 */
	async resolveOrphanedConfirmation(
		userId: string,
		requestId: string,
		data: ConfirmationData,
	): Promise<boolean> {
		let orphan: Awaited<ReturnType<OrphanConfirmationStore['claim']>>;
		try {
			orphan = await this.pendingConfirmationRepo.claim(requestId, userId);
		} catch (error: unknown) {
			this.logger.warn('Failed to claim orphaned pending confirmation', {
				requestId,
				error: getErrorMessage(error),
			});
			return false;
		}
		if (!orphan) return false;

		this.logger.info('Reclaiming pending confirmation orphaned by a process restart', {
			requestId,
			threadId: orphan.threadId,
			runId: orphan.runId,
			kind: orphan.kind,
			hasCheckpoint: Boolean(orphan.checkpointKey),
		});

		if (orphan.kind === 'suspended' && this.canResumeOrphan(orphan)) {
			const resumed = await this.tryResumeFromOrphan(orphan, data);
			if (resumed) return true;
		}

		this.finalizeUnresumableOrphan(orphan);
		throw new UserError(
			'This confirmation was lost when the assistant restarted. Send a new message to continue.',
		);
	}

	private canResumeOrphan(orphan: ClaimedOrphan): orphan is ResumableOrphan {
		return Boolean(orphan.toolCallId && orphan.checkpointKey);
	}

	private finalizeUnresumableOrphan(orphan: ClaimedOrphan): void {
		try {
			// Live SSE clients use this to drop their interactive card.
			this.publishRunFinish(orphan.threadId, orphan.runId, 'restart_lost_confirmation');
			// Terminalise the existing snapshot in place instead of rebuilding
			// the tree from the in-memory event bus. After a restart the bus
			// only carries the run-finish we just emitted, so a rebuild would
			// replace the saved plan/ask card with an empty cancelled tree;
			// `markRunCancelled` keeps the plan content intact while flipping
			// all in-flight nodes and confirmation buttons off.
			void this.dbSnapshotStorage
				.markRunCancelled(orphan.threadId, orphan.runId)
				.catch((error: unknown) => {
					this.logger.warn('Failed to mark orphan snapshot as cancelled', {
						requestId: orphan.requestId,
						threadId: orphan.threadId,
						runId: orphan.runId,
						error: getErrorMessage(error),
					});
				});
		} catch (error: unknown) {
			this.logger.warn('Failed to finalize orphaned confirmation snapshot', {
				requestId: orphan.requestId,
				error: getErrorMessage(error),
			});
		}
	}

	/** Emit a terminal cancelled `run-finish` so live SSE clients drop their
	 *  interactive card. Mirrors `InstanceAiService.publishRunFinish` for the
	 *  one variant the restorer needs. */
	private publishRunFinish(threadId: string, runId: string, reason: string): void {
		this.eventBus.publish(threadId, {
			type: 'run-finish',
			runId,
			agentId: orchestratorAgentId(runId),
			payload: { status: 'cancelled', reason },
		});
	}

	/**
	 * Rebuild the orchestration environment + agent for a checkpoint-backed
	 * suspended run that survived a process restart, register it as a
	 * `SuspendedRunState` in the in-memory registry, and hand off to the
	 * rebuilder's `resumeSuspendedRun` path. The original `runId` /
	 * `messageGroupId` are reused so the frontend's SSE correlation
	 * (`groupIdByRunId`) keeps working.
	 */
	private async tryResumeFromOrphan(
		orphan: ResumableOrphan,
		data: ConfirmationData,
	): Promise<boolean> {
		const outcome = await this.rebuilder.rebuildSuspendedRun(orphan);
		switch (outcome.kind) {
			case 'ready':
				// Re-seed the in-memory runState so `resumeSuspendedRun` can find
				// this confirmation by requestId and the rest of the cancel /
				// liveness / shutdown paths see the run as live. We deliberately
				// do NOT persist the pending confirmation again — the DB row was
				// already consumed by `claim()` above.
				this.runState.suspendRun(orphan.threadId, outcome.state);
				return await this.rebuilder.resumeSuspendedRun(orphan.userId, orphan.requestId, data);
			case 'no-user':
				this.logger.warn('Cannot resume orphaned run: user no longer authorized', {
					requestId: orphan.requestId,
					userId: orphan.userId,
				});
				return false;
			case 'no-checkpoint':
				this.logger.warn('Cannot resume orphaned run: checkpoint missing or unavailable', {
					requestId: orphan.requestId,
					checkpointKey: orphan.checkpointKey,
					...(outcome.error ? { error: getErrorMessage(outcome.error) } : {}),
				});
				return false;
			case 'env-failure':
				this.logger.warn('Cannot resume orphaned run: failed to build execution environment', {
					requestId: orphan.requestId,
					threadId: orphan.threadId,
					error: getErrorMessage(outcome.error),
				});
				return false;
			case 'agent-failure':
				this.logger.warn('Cannot resume orphaned run: failed to build agent', {
					requestId: orphan.requestId,
					threadId: orphan.threadId,
					error: getErrorMessage(outcome.error),
				});
				return false;
		}
	}
}
