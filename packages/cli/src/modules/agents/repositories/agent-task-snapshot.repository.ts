import { Service } from '@n8n/di';
import { DataSource, Repository, type EntityManager } from '@n8n/typeorm';

import { AgentTaskSnapshot } from '../entities/agent-task-snapshot.entity';

type AgentTaskSnapshotData = Pick<
	AgentTaskSnapshot,
	'versionId' | 'taskId' | 'enabled' | 'name' | 'objective' | 'cronExpression'
>;

@Service()
export class AgentTaskSnapshotRepository extends Repository<AgentTaskSnapshot> {
	constructor(dataSource: DataSource) {
		super(AgentTaskSnapshot, dataSource.manager);
	}

	async saveForVersion(snapshots: AgentTaskSnapshotData[], trx?: EntityManager): Promise<void> {
		if (snapshots.length === 0) return;
		const repo = trx?.getRepository(AgentTaskSnapshot) ?? this;
		await repo.insert(snapshots);
	}

	async findByVersionId(versionId: string, trx?: EntityManager): Promise<AgentTaskSnapshot[]> {
		const repo = trx?.getRepository(AgentTaskSnapshot) ?? this;
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
