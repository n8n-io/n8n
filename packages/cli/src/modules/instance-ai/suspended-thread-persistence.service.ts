import type { Logger } from '@n8n/backend-common';
import type { InstanceAiConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import type { ConfirmationData, RunStateRegistry, SuspendedRunState } from '@n8n/instance-ai';
import { UserError } from 'n8n-workflow';

import type { InstanceAiPendingConfirmationRepository } from './repositories/instance-ai-pending-confirmation.repository';
import type { DbSnapshotStorage } from './storage/db-snapshot-storage';
import type { TypeORMAgentMemory } from './storage/typeorm-agent-memory';

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/** A claimed pending-confirmation row, regardless of whether it can be resumed. */
type ClaimedOrphan = NonNullable<
	Awaited<ReturnType<InstanceAiPendingConfirmationRepository['claim']>>
>;

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
 * The run-loop capabilities this service needs to call back into. Kept
 * deliberately minimal: rebuilding the execution environment + agent and
 * driving the resumed stream stay in `InstanceAiService` because they are
 * orchestration machinery, not persistence. This service only owns the
 * persistence and the orphan-restoration *decision* logic.
 */
export interface SuspendedRunRestorationHost {
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
	/** Emit a terminal `run-finish` event so live SSE clients drop their card. */
	publishRunFinish(
		threadId: string,
		runId: string,
		status: 'completed' | 'cancelled' | 'errored',
		reason?: string,
	): void;
}

export interface SuspendedThreadPersistenceServiceOptions {
	logger: Logger;
	config: InstanceAiConfig;
	pendingConfirmationRepo: InstanceAiPendingConfirmationRepository;
	agentMemory: TypeORMAgentMemory;
	dbSnapshotStorage: DbSnapshotStorage;
	runState: RunStateRegistry<User>;
	host: SuspendedRunRestorationHost;
}

/**
 * Owns the DB-backed persistence of suspended Instance AI runs (pending
 * confirmations + the user message that triggered them) and the decision
 * logic for reclaiming a confirmation orphaned by a process restart. Extracted
 * from `InstanceAiService` (INS-393) to keep that service focused on the live
 * run loop.
 *
 * Constructed programmatically (not a `@Service`) — mirroring
 * `InstanceAiLivenessService` — so it can hold a typed back-reference to the
 * host's run-loop machinery without widening that machinery's visibility.
 */
export class SuspendedThreadPersistenceService {
	private readonly logger: Logger;

	private readonly config: InstanceAiConfig;

	private readonly pendingConfirmationRepo: InstanceAiPendingConfirmationRepository;

	private readonly agentMemory: TypeORMAgentMemory;

	private readonly dbSnapshotStorage: DbSnapshotStorage;

	private readonly runState: RunStateRegistry<User>;

	private readonly host: SuspendedRunRestorationHost;

	constructor(options: SuspendedThreadPersistenceServiceOptions) {
		this.logger = options.logger;
		this.config = options.config;
		this.pendingConfirmationRepo = options.pendingConfirmationRepo;
		this.agentMemory = options.agentMemory;
		this.dbSnapshotStorage = options.dbSnapshotStorage;
		this.runState = options.runState;
		this.host = options.host;
	}

	async pruneStalePendingConfirmations(now: number): Promise<void> {
		try {
			const count = await this.pendingConfirmationRepo.deleteExpired(new Date(now));
			if (count === 0) {
				this.logger.debug('No stale Instance AI pending confirmations to drop');
				return;
			}
			this.logger.info('Dropped stale Instance AI pending confirmations', { count });
		} catch (error: unknown) {
			this.logger.warn('Failed to drop stale Instance AI pending confirmations', {
				error: getErrorMessage(error),
			});
		}
	}

	private computePendingConfirmationExpiresAt(): Date | null {
		const timeoutMs = this.config.confirmationTimeout;
		return timeoutMs > 0 ? new Date(Date.now() + timeoutMs) : null;
	}

	/**
	 * Persist the index for a HITL confirmation so a fresh process can find it
	 * after the in-memory `pendingConfirmations` / `suspendedRuns` maps are gone.
	 * Fire-and-forget: a DB write failure must not block the agent flow, which
	 * still operates correctly via the in-memory state on this main.
	 */
	async persistPendingConfirmation(params: {
		requestId: string;
		threadId: string;
		userId: string;
		runId: string;
		messageGroupId?: string;
		kind: 'inline' | 'suspended';
		toolCallId?: string;
		checkpointKey?: string;
		checkpointTaskId?: string;
	}): Promise<void> {
		try {
			await this.pendingConfirmationRepo.save(
				this.pendingConfirmationRepo.create({
					requestId: params.requestId,
					threadId: params.threadId,
					userId: params.userId,
					kind: params.kind,
					runId: params.runId,
					messageGroupId: params.messageGroupId ?? null,
					toolCallId: params.toolCallId ?? null,
					checkpointKey: params.checkpointKey ?? null,
					checkpointTaskId: params.checkpointTaskId ?? null,
					expiresAt: this.computePendingConfirmationExpiresAt(),
				}),
			);
		} catch (error: unknown) {
			this.logger.warn('Failed to persist pending confirmation', {
				requestId: params.requestId,
				threadId: params.threadId,
				kind: params.kind,
				error: getErrorMessage(error),
			});
		}
	}

	async dropPendingConfirmation(requestId: string): Promise<void> {
		try {
			await this.pendingConfirmationRepo.deleteByRequestId(requestId);
		} catch (error: unknown) {
			this.logger.warn('Failed to drop pending confirmation', {
				requestId,
				error: getErrorMessage(error),
			});
		}
	}

	async dropPendingConfirmationsForThread(threadId: string): Promise<void> {
		try {
			await this.pendingConfirmationRepo.deleteByThreadId(threadId);
		} catch (error: unknown) {
			this.logger.warn('Failed to drop pending confirmations for thread', {
				threadId,
				error: getErrorMessage(error),
			});
		}
	}

	/**
	 * Persist the original user-typed message to thread memory the first time
	 * a run hits an inline HITL confirmation, so the message bubble survives
	 * a restart that happens while the run is suspended. The `id` matches the
	 * one we pass to the SDK's streamInput, so the SDK's eventual end-of-turn
	 * save (if the run does resume and complete) upserts the same row instead
	 * of creating a duplicate.
	 */
	async persistUserMessageOnSuspend(
		threadId: string,
		userId: string,
		message: { id: string; text: string },
	): Promise<boolean> {
		try {
			await this.agentMemory.saveMessages({
				threadId,
				resourceId: userId,
				messages: [
					{
						id: message.id,
						role: 'user',
						content: [{ type: 'text', text: message.text }],
						createdAt: new Date(),
					},
				],
			});
			return true;
		} catch (error: unknown) {
			this.logger.warn('Failed to persist user message on HITL suspend', {
				threadId,
				userId,
				error: getErrorMessage(error),
			});
			return false;
		}
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
		let orphan: Awaited<ReturnType<InstanceAiPendingConfirmationRepository['claim']>>;
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
			this.host.publishRunFinish(
				orphan.threadId,
				orphan.runId,
				'cancelled',
				'restart_lost_confirmation',
			);
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

	/**
	 * Rebuild the orchestration environment + agent for a checkpoint-backed
	 * suspended run that survived a process restart, register it as a
	 * `SuspendedRunState` in the in-memory registry, and hand off to the
	 * host's `resumeSuspendedRun` path. The original `runId` / `messageGroupId`
	 * are reused so the frontend's SSE correlation (`groupIdByRunId`) keeps
	 * working.
	 */
	private async tryResumeFromOrphan(
		orphan: ResumableOrphan,
		data: ConfirmationData,
	): Promise<boolean> {
		const outcome = await this.host.rebuildSuspendedRun(orphan);
		switch (outcome.kind) {
			case 'ready':
				// Re-seed the in-memory runState so `resumeSuspendedRun` can find
				// this confirmation by requestId and the rest of the cancel /
				// liveness / shutdown paths see the run as live. We deliberately
				// do NOT call `persistPendingConfirmation` again — the DB row
				// was already consumed by `claim()` above.
				this.runState.suspendRun(orphan.threadId, outcome.state);
				return await this.host.resumeSuspendedRun(orphan.userId, orphan.requestId, data);
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
