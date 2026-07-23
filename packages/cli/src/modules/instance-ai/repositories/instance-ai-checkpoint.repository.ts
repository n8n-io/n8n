import { Service } from '@n8n/di';
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
