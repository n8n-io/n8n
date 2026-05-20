import type { AgentEvaluationSuiteRun } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AgentEvaluationRun } from '../entities/agent-evaluation-run.entity';

@Service()
export class AgentEvaluationRunRepository extends Repository<AgentEvaluationRun> {
	constructor(dataSource: DataSource) {
		super(AgentEvaluationRun, dataSource.manager);
	}

	async findRecentByAgent(
		projectId: string,
		agentId: string,
		limit: number,
	): Promise<AgentEvaluationRun[]> {
		return await this.find({
			where: { projectId, agentId },
			order: { completedAt: 'DESC' },
			take: limit,
		});
	}

	async saveRun(
		projectId: string,
		agentId: string,
		userId: string,
		run: AgentEvaluationSuiteRun,
	): Promise<void> {
		await this.save(
			this.create({
				id: run.id,
				projectId,
				agentId,
				agentVersionId: run.agentVersionId,
				suiteId: run.suiteId,
				startedAt: new Date(run.startedAt),
				completedAt: new Date(run.completedAt),
				summary: run.summary,
				cases: run.cases,
				warnings: run.warnings,
				createdById: userId,
			}),
		);
	}
}
