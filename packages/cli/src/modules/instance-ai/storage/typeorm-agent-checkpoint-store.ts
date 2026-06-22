import { Service } from '@n8n/di';
import type { CheckpointStore, SerializableAgentState } from '@n8n/instance-ai';
import { LessThan } from '@n8n/typeorm';
import { UnexpectedError, UserError } from 'n8n-workflow';

import { InstanceAiCheckpointRepository } from '../repositories/instance-ai-checkpoint.repository';

const EXPIRED_CHECKPOINT_MESSAGE =
	'This action has expired and cannot be resumed. Please start a new turn.';

@Service()
export class TypeORMAgentCheckpointStore implements CheckpointStore {
	constructor(private readonly checkpointRepo: InstanceAiCheckpointRepository) {}

	async save(key: string, state: SerializableAgentState): Promise<void> {
		const threadId = state.persistence?.threadId;
		if (!threadId) {
			throw new UnexpectedError('Instance AI checkpoint state is missing a thread id', {
				extra: { key },
			});
		}

		const existing = await this.checkpointRepo.findOne({ where: { key } });
		if (existing) {
			existing.runId = this.getRunId(key);
			existing.threadId = threadId;
			existing.resourceId = state.persistence?.resourceId ?? null;
			existing.state = state;
			existing.expiredAt = null;
			await this.checkpointRepo.save(existing);
			return;
		}

		const checkpoint = this.checkpointRepo.create({
			key,
			runId: this.getRunId(key),
			threadId,
			resourceId: state.persistence?.resourceId ?? null,
			state,
			expiredAt: null,
		});
		await this.checkpointRepo.save(checkpoint);
	}

	async load(key: string): Promise<SerializableAgentState | undefined> {
		const checkpoint = await this.checkpointRepo.findOne({ where: { key } });
		if (!checkpoint) return undefined;
		if (checkpoint.expiredAt !== null || checkpoint.state === null) {
			throw new UserError(EXPIRED_CHECKPOINT_MESSAGE);
		}
		return checkpoint.state;
	}

	async delete(key: string): Promise<void> {
		// Soft-delete: keep the row as a tombstone (mirrors the first-class
		// agents' N8NCheckpointStorage) so a stale resume gets a clear
		// "expired" error instead of an indistinguishable "not found".
		// The heavy state blob is released so the row stays cheap.
		await this.checkpointRepo.update({ key }, { expiredAt: new Date(), state: null });
	}

	async markExpiredOlderThan(olderThan: Date): Promise<number> {
		const result = await this.checkpointRepo
			.createQueryBuilder()
			.update()
			.set({ expiredAt: new Date(), state: null })
			.where('updatedAt < :olderThan', { olderThan })
			.andWhere('expiredAt IS NULL')
			.execute();
		return result.affected ?? 0;
	}

	/**
	 * Backwards-compat shim for the SDK's `CheckpointStore`-style pruning
	 * helper that pre-dates the soft-delete switch. The semantics now match
	 * `markExpiredOlderThan` — the row stays, the blob does not.
	 */
	async deleteOlderThan(olderThan: Date): Promise<number> {
		return await this.markExpiredOlderThan(olderThan);
	}

	/**
	 * Look up the most recent suspended sub-agent run for a given resourceId
	 * and pull the info needed to resume it. This supports deterministic
	 * sub-agent persistence for suspended background or delegated work.
	 */
	async findSuspendedSubAgentResumeInfo(resourceId: string): Promise<
		| {
				runId: string;
				toolCallId: string;
				persistence: { threadId: string; resourceId: string };
		  }
		| undefined
	> {
		const row = await this.checkpointRepo.findActiveByResourceId(resourceId);
		if (!row?.state) return undefined;
		// `pendingToolCalls` can hold parallel tool calls from one turn, only
		// some of which suspended. Pick the suspended entry explicitly so we
		// don't try to resume a tool that ran to completion in the same batch.
		const suspendedEntry = Object.entries(row.state.pendingToolCalls ?? {}).find(
			([, call]) => call.suspended,
		);
		const persistence = row.state.persistence;
		if (!suspendedEntry || !persistence?.threadId || !persistence.resourceId) return undefined;
		return {
			runId: row.key,
			toolCallId: suspendedEntry[0],
			persistence: { threadId: persistence.threadId, resourceId: persistence.resourceId },
		};
	}

	/** Drop expired tombstones outright once they're past the GC horizon. */
	async hardDeleteExpiredOlderThan(olderThan: Date): Promise<number> {
		const result = await this.checkpointRepo.delete({
			expiredAt: LessThan(olderThan),
		});
		return result.affected ?? 0;
	}

	private getRunId(key: string): string | null {
		const separatorIndex = key.lastIndexOf(':');
		if (separatorIndex < 0 || separatorIndex === key.length - 1) return null;
		return key.slice(separatorIndex + 1);
	}
}
