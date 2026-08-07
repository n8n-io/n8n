import {
	activeLifecycleState,
	droppedLifecycleState,
	estimateObservationTokens,
	normalizeObservationLogReflection,
	supersededLifecycleState,
	type BuiltObservationLogStore,
	type BuiltObservationLogTaskLockStore,
	type NewObservationLogEntry,
	type ObservationCursor,
	type ObservationLogEntry,
	type ObservationLogReadOptions,
	type ObservationLogReflection,
	type ObservationLogReflectionResult,
	type ObservationLogScope,
	type ObservationLogTaskKind,
	type ObservationLogTaskLockHandle,
} from '@n8n/agents';
import type { AgentDbMessage } from '@n8n/instance-ai';
import { Equal, In, IsNull, MoreThan, type FindOptionsWhere } from '@n8n/typeorm';

import type { InstanceAiMessage } from '../entities/instance-ai-message.entity';
import { InstanceAiObservationLock } from '../entities/instance-ai-observation-lock.entity';
import { InstanceAiObservation } from '../entities/instance-ai-observation.entity';
import type { InstanceAiMessageRepository } from '../repositories/instance-ai-message.repository';
import type { InstanceAiObservationCursorRepository } from '../repositories/instance-ai-observation-cursor.repository';
import type { InstanceAiObservationLockRepository } from '../repositories/instance-ai-observation-lock.repository';
import type { InstanceAiObservationRepository } from '../repositories/instance-ai-observation.repository';

function toObservationLogEntry(entity: InstanceAiObservation): ObservationLogEntry {
	return {
		id: entity.id,
		observationScopeId: entity.observationScopeId,
		marker: entity.marker,
		text: entity.text,
		parentId: entity.parentId,
		tokenCount: Number(entity.tokenCount),
		status: entity.status,
		supersededBy: entity.supersededBy,
		createdAt: entity.createdAt,
	};
}

export class TypeORMObservationLogStore
	implements BuiltObservationLogStore, BuiltObservationLogTaskLockStore
{
	constructor(
		private readonly observationRepo: InstanceAiObservationRepository,
		private readonly observationCursorRepo: InstanceAiObservationCursorRepository,
		private readonly observationLockRepo: InstanceAiObservationLockRepository,
		private readonly messageRepo: InstanceAiMessageRepository,
		private readonly toAgentMessage: (entity: InstanceAiMessage) => AgentDbMessage | undefined,
	) {}

	async appendObservationLogEntries(
		rows: NewObservationLogEntry[],
	): Promise<ObservationLogEntry[]> {
		if (rows.length === 0) return [];

		const entities = rows.map((row) =>
			this.observationRepo.create({
				observationScopeId: row.observationScopeId,
				marker: row.marker,
				text: row.text,
				parentId: row.parentId ?? null,
				tokenCount: row.tokenCount ?? estimateObservationTokens(row.text),
				...activeLifecycleState(),
				createdAt: row.createdAt,
			}),
		);

		const saved = await this.observationRepo.save(entities);

		return saved.map((entity) => toObservationLogEntry(entity));
	}

	async getActiveObservationLog(
		scope: ObservationLogScope & { limit?: number; order?: 'asc' | 'desc' },
	): Promise<ObservationLogEntry[]> {
		return await this.getObservationLog({ ...scope, status: 'active' });
	}

	async getObservationLog(opts: ObservationLogReadOptions): Promise<ObservationLogEntry[]> {
		const baseWhere: FindOptionsWhere<InstanceAiObservation> = {
			observationScopeId: opts.observationScopeId,
			...(opts.status !== undefined && { status: opts.status }),
			...(opts.parentId !== undefined && { parentId: opts.parentId ?? IsNull() }),
		};

		const entities = await this.observationRepo.find({
			where: [baseWhere],
			order: {
				createdAt: opts.order === 'desc' ? 'DESC' : 'ASC',
				id: opts.order === 'desc' ? 'DESC' : 'ASC',
			},
			...(opts.limit !== undefined && { take: opts.limit }),
		});
		return entities.map((entity) => toObservationLogEntry(entity));
	}

	async getMessagesForObservationScope(
		observationScopeId: string,
		opts?: { since?: { sinceCreatedAt: Date; sinceMessageId: string } },
	): Promise<AgentDbMessage[]> {
		const baseWhere: FindOptionsWhere<InstanceAiMessage> = {
			threadId: observationScopeId,
		};

		const where: Array<FindOptionsWhere<InstanceAiMessage>> = opts?.since
			? [
					{ ...baseWhere, createdAt: MoreThan(opts.since.sinceCreatedAt) },
					{
						...baseWhere,
						createdAt: Equal(opts.since.sinceCreatedAt),
						id: MoreThan(opts.since.sinceMessageId),
					},
				]
			: [baseWhere];

		const entities = await this.messageRepo.find({
			where,
			order: { createdAt: 'ASC', id: 'ASC' },
		});

		return entities.flatMap((entity) => {
			const message = this.toAgentMessage(entity);

			return message ? [message] : [];
		});
	}

	async dropObservationLogEntries(ids: string[]): Promise<void> {
		if (ids.length === 0) return;

		await this.observationRepo.update({ id: In(ids) }, droppedLifecycleState());
	}

	async supersedeObservationLogEntries(ids: string[], supersededBy: string): Promise<void> {
		if (ids.length === 0) return;

		await this.observationRepo.update({ id: In(ids) }, supersededLifecycleState(supersededBy));
	}

	async applyObservationLogReflection(
		scope: ObservationLogScope,
		reflection: ObservationLogReflection,
	): Promise<ObservationLogReflectionResult> {
		return await this.observationRepo.manager.transaction(async (trx) => {
			const repo = trx.getRepository(InstanceAiObservation);

			const activeEntries = await repo.find({
				where: {
					observationScopeId: scope.observationScopeId,
					status: 'active',
				},
				order: { createdAt: 'ASC', id: 'ASC' },
			});

			const normalized = normalizeObservationLogReflection(
				activeEntries.map((entry) => toObservationLogEntry(entry)),
				reflection,
			);

			const inserted = normalized.merge.length
				? await repo.save(
						normalized.merge.map((entry) =>
							repo.create({
								observationScopeId: scope.observationScopeId,
								marker: entry.marker,
								text: entry.text,
								parentId: entry.parentId ?? null,
								tokenCount: entry.tokenCount ?? estimateObservationTokens(entry.text),
								...activeLifecycleState(),
								createdAt: entry.createdAt,
							}),
						),
					)
				: [];

			if (normalized.drop.length > 0) {
				await repo.update(
					{
						observationScopeId: scope.observationScopeId,
						id: In(normalized.drop),
					},
					droppedLifecycleState(),
				);
			}

			for (const [index, merge] of normalized.merge.entries()) {
				const replacement = inserted[index];
				if (replacement && merge.supersedes.length > 0) {
					await repo.update(
						{
							observationScopeId: scope.observationScopeId,
							id: In(merge.supersedes),
						},
						supersededLifecycleState(replacement.id),
					);
				}
			}

			return {
				droppedIds: [...normalized.drop],
				supersededIds: normalized.merge.flatMap((entry) => entry.supersedes),
				inserted: inserted.map((entry) => toObservationLogEntry(entry)),
			};
		});
	}

	async getCursor(observationScopeId: string): Promise<ObservationCursor | null> {
		const entity = await this.observationCursorRepo.findOneBy({ observationScopeId });

		if (!entity) return null;

		return {
			observationScopeId: entity.observationScopeId,
			lastObservedMessageId: entity.lastObservedMessageId,
			lastObservedAt: entity.lastObservedAt,
			updatedAt: entity.updatedAt,
		};
	}

	async setCursor(cursor: ObservationCursor): Promise<void> {
		await this.observationCursorRepo.upsert(
			{
				observationScopeId: cursor.observationScopeId,
				lastObservedMessageId: cursor.lastObservedMessageId,
				lastObservedAt: cursor.lastObservedAt,
				updatedAt: cursor.updatedAt,
			},
			{
				conflictPaths: ['observationScopeId'],
				skipUpdateIfNoValuesChanged: false,
			},
		);
	}

	async acquireObservationLogTaskLock(
		observationScopeId: string,
		taskKind: ObservationLogTaskKind,
		opts: { ttlMs: number; holderId: string },
	): Promise<ObservationLogTaskLockHandle | null> {
		const now = new Date();
		const heldUntil = new Date(now.getTime() + opts.ttlMs);

		const updateResult = await this.observationLockRepo
			.createQueryBuilder()
			.update(InstanceAiObservationLock)
			.set({ taskKind, holderId: opts.holderId, heldUntil })
			.where('"observationScopeId" = :observationScopeId')
			.andWhere('"taskKind" = :taskKind')
			.andWhere('("holderId" = :holderId OR "heldUntil" <= :now)')
			.setParameters({
				observationScopeId,
				taskKind,
				holderId: opts.holderId,
				now,
			})
			.execute();

		if ((updateResult.affected ?? 0) > 0) {
			return { observationScopeId, taskKind, holderId: opts.holderId, heldUntil };
		}

		await this.observationLockRepo
			.createQueryBuilder()
			.insert()
			.into(InstanceAiObservationLock)
			.values({
				observationScopeId,
				taskKind,
				holderId: opts.holderId,
				heldUntil,
			})
			.orIgnore()
			.execute();

		const claimed = await this.observationLockRepo.findOneBy({
			observationScopeId,
			taskKind,
			holderId: opts.holderId,
		});

		if (!claimed) return null;

		return { observationScopeId, taskKind, holderId: opts.holderId, heldUntil };
	}

	async releaseObservationLogTaskLock(handle: ObservationLogTaskLockHandle): Promise<void> {
		await this.observationLockRepo.delete({
			observationScopeId: handle.observationScopeId,
			taskKind: handle.taskKind,
			holderId: handle.holderId,
		});
	}
}
