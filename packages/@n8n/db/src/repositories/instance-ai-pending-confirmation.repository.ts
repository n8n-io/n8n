import { Service } from '@n8n/di';
import { DataSource, LessThan, MoreThan, Repository } from '@n8n/typeorm';
import type { EntityManager } from '@n8n/typeorm';

import { InstanceAiPendingConfirmation, type InstanceAiPendingConfirmationKind } from '../entities';

export interface RegisterPendingConfirmationInput {
	requestId: string;
	threadId: string;
	userId: string;
	kind: InstanceAiPendingConfirmationKind;
	runId: string;
	mastraRunId?: string | null;
	toolCallId?: string | null;
	messageGroupId?: string | null;
	checkpointTaskId?: string | null;
	expiresAt: Date;
}

@Service()
export class InstanceAiPendingConfirmationRepository extends Repository<InstanceAiPendingConfirmation> {
	constructor(dataSource: DataSource) {
		super(InstanceAiPendingConfirmation, dataSource.manager);
	}

	async register(
		input: RegisterPendingConfirmationInput,
		entityManager: EntityManager = this.manager,
	): Promise<void> {
		await entityManager.upsert(
			InstanceAiPendingConfirmation,
			{
				requestId: input.requestId,
				threadId: input.threadId,
				userId: input.userId,
				kind: input.kind,
				runId: input.runId,
				mastraRunId: input.mastraRunId ?? null,
				toolCallId: input.toolCallId ?? null,
				messageGroupId: input.messageGroupId ?? null,
				checkpointTaskId: input.checkpointTaskId ?? null,
				expiresAt: input.expiresAt,
			},
			['requestId'],
		);
	}

	async findByRequestId(
		requestId: string,
		now: Date = new Date(),
	): Promise<InstanceAiPendingConfirmation | null> {
		return await this.findOne({
			where: { requestId, expiresAt: MoreThan(now) },
		});
	}

	/** Source-of-truth check for "is this thread suspended anywhere in the
	 *  fleet?" Used by cross-instance flow guards (run-conflict gating,
	 *  checkpoint re-entry, public thread status). Filters out expired rows
	 *  via the `expiresAt > now` predicate so a stale row past its TTL never
	 *  blocks a fresh run on the same thread. */
	async existsSuspendedForThread(threadId: string, now: Date = new Date()): Promise<boolean> {
		return await this.existsBy({
			threadId,
			kind: 'suspended',
			expiresAt: MoreThan(now),
		});
	}

	/** Fetch all rows for a thread (any kind, ignoring expiry). Used by the
	 *  cancel/clear lifecycle to capture `mastraRunId` + `runId` from each row
	 *  before deletion, so Mastra-snapshot cleanup and trace finalization can
	 *  proceed against rows that originated on a different instance. */
	async findByThread(threadId: string): Promise<InstanceAiPendingConfirmation[]> {
		return await this.find({ where: { threadId } });
	}

	async deleteByRequestId(
		requestId: string,
		entityManager: EntityManager = this.manager,
	): Promise<void> {
		await entityManager.delete(InstanceAiPendingConfirmation, { requestId });
	}

	/** Atomic claim: deletes the row and returns true if this caller owned the
	 *  delete (concurrent confirmations / cancellations / TTL sweeper see false).
	 *  Used by the restart-resume path to serialize concurrent confirms across
	 *  instances — the row IS the lock token. */
	async claim(requestId: string, entityManager: EntityManager = this.manager): Promise<boolean> {
		const result = await entityManager.delete(InstanceAiPendingConfirmation, { requestId });
		return (result.affected ?? 0) > 0;
	}

	async deleteByThread(
		threadId: string,
		entityManager: EntityManager = this.manager,
	): Promise<void> {
		await entityManager.delete(InstanceAiPendingConfirmation, { threadId });
	}

	async deleteExpired(
		now: Date = new Date(),
		entityManager: EntityManager = this.manager,
	): Promise<number> {
		const result = await entityManager.delete(InstanceAiPendingConfirmation, {
			expiresAt: LessThan(now),
		});
		return result.affected ?? 0;
	}
}
