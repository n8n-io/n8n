import type { Logger } from '@n8n/backend-common';
import type { InstanceAiConfig } from '@n8n/config';
import type { AgentDbMessage } from '@n8n/instance-ai';
import type { DeepPartial } from '@n8n/typeorm';

import type { InstanceAiPendingConfirmation } from './entities/instance-ai-pending-confirmation.entity';

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/**
 * The slice of the pending-confirmation repository this service writes to.
 * Kept narrow so callers (and tests) see exactly which persistence operations
 * are used, and so tests can pass a plain typed mock instead of the full repo.
 */
export interface PendingConfirmationStore {
	create(entityLike: DeepPartial<InstanceAiPendingConfirmation>): InstanceAiPendingConfirmation;
	save(entity: InstanceAiPendingConfirmation): Promise<InstanceAiPendingConfirmation>;
	deleteByRequestId(requestId: string): Promise<number>;
	deleteByThreadId(threadId: string): Promise<number>;
	deleteExpired(now: Date): Promise<number>;
}

/** The slice of thread memory used to persist a user message on suspend. */
export interface UserMessageStore {
	saveMessages(args: {
		threadId: string;
		resourceId: string;
		messages: AgentDbMessage[];
	}): Promise<void>;
}

export interface SuspendedThreadPersistenceServiceOptions {
	logger: Logger;
	config: Pick<InstanceAiConfig, 'confirmationTimeout'>;
	pendingConfirmationRepo: PendingConfirmationStore;
	agentMemory: UserMessageStore;
}

/**
 * Owns the DB-backed persistence of suspended Instance AI runs: the pending
 * confirmation index rows and the user message that triggered them. Extracted
 * from `InstanceAiService` (INS-393) to keep that service focused on the live
 * run loop.
 *
 * Deliberately scoped to persistence only — claiming and resuming a
 * confirmation orphaned by a process restart needs the run-loop machinery
 * (checkpoint rebuild, run-state registry, SSE) and stays in `InstanceAiService`.
 *
 * Constructed programmatically (not a `@Service`) — mirroring
 * `InstanceAiLivenessService` — taking only the narrow capability interfaces it
 * actually uses.
 */
export class SuspendedThreadPersistenceService {
	private readonly logger: Logger;

	private readonly config: Pick<InstanceAiConfig, 'confirmationTimeout'>;

	private readonly pendingConfirmationRepo: PendingConfirmationStore;

	private readonly agentMemory: UserMessageStore;

	constructor(options: SuspendedThreadPersistenceServiceOptions) {
		this.logger = options.logger;
		this.config = options.config;
		this.pendingConfirmationRepo = options.pendingConfirmationRepo;
		this.agentMemory = options.agentMemory;
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
}
