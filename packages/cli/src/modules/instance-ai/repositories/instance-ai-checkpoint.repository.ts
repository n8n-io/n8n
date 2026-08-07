import { isDeepStrictEqual } from 'node:util';

import { Service } from '@n8n/di';
import type { SerializableAgentState } from '@n8n/instance-ai';
import { DataSource, IsNull, Repository } from '@n8n/typeorm';

import { InstanceAiCheckpoint } from '../entities/instance-ai-checkpoint.entity';

@Service()
export class InstanceAiCheckpointRepository extends Repository<InstanceAiCheckpoint> {
	constructor(dataSource: DataSource) {
		super(InstanceAiCheckpoint, dataSource.manager);
	}

	/**
	 * Live (non-expired) checkpoints for a thread, newest first. Used to
	 * surface in-flight messages from suspended runs whose `messageList`
	 * hasn't been committed back to `instance_ai_messages` yet. The inbound
	 * user message is persisted on receipt, but the intermediate assistant
	 * responses and pending tool-call from a turn suspended at HITL are only
	 * committed at the end of a successful loop — until the run resumes and
	 * completes, those artifacts live only in the checkpoint blob.
	 */
	async findActiveByThreadId(threadId: string): Promise<InstanceAiCheckpoint[]> {
		return await this.find({
			where: { threadId, expiredAt: IsNull() },
			order: { createdAt: 'DESC' },
		});
	}

	/**
	 * Atomically flip a suspended checkpoint to 'running'. Single-winner across
	 * concurrent resumes (e.g. two mains claiming the same approval): all but
	 * one caller return false. Mirrors the pending-confirmation `claim()`.
	 */
	async claimSuspendedForResume(
		key: string,
		expectedState: SerializableAgentState,
	): Promise<boolean> {
		return await this.manager.transaction(async (manager) => {
			const repo = manager.getRepository(InstanceAiCheckpoint);
			const row = await repo.findOne({
				where: { key, expiredAt: IsNull() },
				...(manager.connection.options.type === 'postgres'
					? { lock: { mode: 'pessimistic_write' as const } }
					: {}),
			});
			if (
				!row?.state ||
				row.state.status !== 'suspended' ||
				!isDeepStrictEqual(row.state, expectedState)
			) {
				return false;
			}

			row.state = { ...row.state, status: 'running' };
			await repo.save(row);
			return true;
		});
	}

	/**
	 * Find the most recent active (non-expired) checkpoint for a given
	 * resourceId. Sub-agent resourceIds are deterministically derived from the
	 * parent thread and agent kind, so callers can compute the resourceId
	 * without stashing it across suspend/resume cycles.
	 */
	async findActiveByResourceId(resourceId: string): Promise<InstanceAiCheckpoint | undefined> {
		const row = await this.findOne({
			where: { resourceId, expiredAt: IsNull() },
			order: { createdAt: 'DESC' },
		});
		return row ?? undefined;
	}
}
