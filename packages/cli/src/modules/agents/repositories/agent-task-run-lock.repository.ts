import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AgentTaskRunLock } from '../entities/agent-task-run-lock.entity';

export type AgentTaskRunLockHandle = Pick<
	AgentTaskRunLock,
	'agentId' | 'taskId' | 'holderId' | 'heldUntil'
>;

@Service()
export class AgentTaskRunLockRepository extends Repository<AgentTaskRunLock> {
	constructor(dataSource: DataSource) {
		super(AgentTaskRunLock, dataSource.manager);
	}

	async acquire(
		agentId: string,
		taskId: string,
		opts: { ttlMs: number; holderId: string },
	): Promise<AgentTaskRunLockHandle | null> {
		const now = new Date();
		const heldUntil = new Date(now.getTime() + opts.ttlMs);

		const updateResult = await this.createQueryBuilder()
			.update(AgentTaskRunLock)
			.set({ holderId: opts.holderId, heldUntil })
			.where('"agentId" = :agentId')
			.andWhere('"taskId" = :taskId')
			.andWhere('("holderId" = :holderId OR "heldUntil" <= :now)')
			.setParameters({
				agentId,
				taskId,
				holderId: opts.holderId,
				now,
			})
			.execute();

		if ((updateResult.affected ?? 0) > 0) {
			return { agentId, taskId, holderId: opts.holderId, heldUntil };
		}

		await this.createQueryBuilder()
			.insert()
			.into(AgentTaskRunLock)
			.values({ agentId, taskId, holderId: opts.holderId, heldUntil })
			.orIgnore()
			.execute();

		const claimed = await this.findOneBy({ agentId, taskId, holderId: opts.holderId });
		if (!claimed) return null;

		return { agentId, taskId, holderId: opts.holderId, heldUntil };
	}

	async renew(handle: AgentTaskRunLockHandle, ttlMs: number): Promise<boolean> {
		const heldUntil = new Date(Date.now() + ttlMs);
		const result = await this.update(
			{
				agentId: handle.agentId,
				taskId: handle.taskId,
				holderId: handle.holderId,
			},
			{ heldUntil },
		);
		return (result.affected ?? 0) > 0;
	}

	async release(handle: AgentTaskRunLockHandle): Promise<void> {
		await this.delete({
			agentId: handle.agentId,
			taskId: handle.taskId,
			holderId: handle.holderId,
		});
	}
}
