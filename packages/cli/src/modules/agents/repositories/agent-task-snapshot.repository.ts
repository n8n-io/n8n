import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { AgentTaskSnapshot } from '../entities/agent-task-snapshot.entity';

type AgentTaskSnapshotData = Pick<
	AgentTaskSnapshot,
	'versionId' | 'taskId' | 'enabled' | 'name' | 'objective' | 'cronExpression' | 'timezone'
>;

@Service()
export class AgentTaskSnapshotRepository extends BaseRepository<AgentTaskSnapshot> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentTaskSnapshot, dataSource.manager, transactionRunner);
	}

	async saveForVersion(
		snapshots: AgentTaskSnapshotData[],
		ctx: OperationContext = {},
	): Promise<void> {
		if (snapshots.length === 0) return;
		const repo = this.managerFor(ctx).getRepository(AgentTaskSnapshot);
		await repo.insert(snapshots);
	}

	async findByVersionId(
		versionId: string,
		ctx: OperationContext = {},
	): Promise<AgentTaskSnapshot[]> {
		const repo = this.managerFor(ctx).getRepository(AgentTaskSnapshot);
		return await repo.find({ where: { versionId }, order: { createdAt: 'ASC' } });
	}

	async findEnabledByVersionId(versionId: string): Promise<AgentTaskSnapshot[]> {
		return await this.find({
			where: { versionId, enabled: true },
			order: { createdAt: 'ASC' },
		});
	}

	async findByVersionAndTaskId(
		versionId: string,
		taskId: string,
	): Promise<AgentTaskSnapshot | null> {
		return await this.findOne({ where: { versionId, taskId } });
	}
}
