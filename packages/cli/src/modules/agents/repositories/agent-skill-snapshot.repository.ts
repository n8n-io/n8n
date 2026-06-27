import { Service } from '@n8n/di';
import { DataSource, Repository, type EntityManager } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';

import { AgentSkillSnapshot } from '../entities/agent-skill-snapshot.entity';

type AgentSkillSnapshotData = Pick<
	AgentSkillSnapshot,
	| 'versionId'
	| 'skillId'
	| 'name'
	| 'description'
	| 'instructions'
	| 'allowedTools'
	| 'recommendedTools'
	| 'interfaceData'
	| 'policy'
	| 'dependencies'
	| 'versionName'
	| 'license'
	| 'compatibility'
	| 'platforms'
	| 'metadata'
	| 'linkedFiles'
>;

@Service()
export class AgentSkillSnapshotRepository extends Repository<AgentSkillSnapshot> {
	constructor(dataSource: DataSource) {
		super(AgentSkillSnapshot, dataSource.manager);
	}

	async saveForVersion(snapshots: AgentSkillSnapshotData[], trx?: EntityManager): Promise<void> {
		if (snapshots.length === 0) return;
		const repo = trx?.getRepository(AgentSkillSnapshot) ?? this;
		type InsertShape = QueryDeepPartialEntity<AgentSkillSnapshot>;
		await repo.insert(
			snapshots.map((snapshot) => ({
				...snapshot,
				allowedTools: snapshot.allowedTools as InsertShape['allowedTools'],
				recommendedTools: snapshot.recommendedTools as InsertShape['recommendedTools'],
				interfaceData: snapshot.interfaceData as InsertShape['interfaceData'],
				policy: snapshot.policy as InsertShape['policy'],
				dependencies: snapshot.dependencies as InsertShape['dependencies'],
				platforms: snapshot.platforms as InsertShape['platforms'],
				metadata: snapshot.metadata as InsertShape['metadata'],
				linkedFiles: snapshot.linkedFiles as InsertShape['linkedFiles'],
			})),
		);
	}

	async findByVersionId(versionId: string, trx?: EntityManager): Promise<AgentSkillSnapshot[]> {
		const repo = trx?.getRepository(AgentSkillSnapshot) ?? this;
		return await repo.find({ where: { versionId }, order: { createdAt: 'ASC' } });
	}
}
