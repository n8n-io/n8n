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

	async deleteByRequestId(
		requestId: string,
		entityManager: EntityManager = this.manager,
	): Promise<void> {
		await entityManager.delete(InstanceAiPendingConfirmation, { requestId });
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
