import type { AgentReviewSummary } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { DataSource, In, Repository } from '@n8n/typeorm';

import { AgentEvaluationCase } from '../entities/agent-evaluation-case.entity';

@Service()
export class AgentEvaluationCaseRepository extends Repository<AgentEvaluationCase> {
	constructor(dataSource: DataSource) {
		super(AgentEvaluationCase, dataSource.manager);
	}

	async findByExecutionIds(executionIds: string[]): Promise<AgentEvaluationCase[]> {
		if (executionIds.length === 0) return [];

		return await this.find({ where: { executionId: In(executionIds) } });
	}

	async findByExecutionId(
		projectId: string,
		agentId: string,
		executionId: string,
	): Promise<AgentEvaluationCase | null> {
		return await this.findOne({ where: { projectId, agentId, executionId } });
	}

	async findByAgent(
		projectId: string,
		agentId: string,
		limit: number,
		cursor?: string,
	): Promise<AgentEvaluationCase[]> {
		const query = this.createQueryBuilder('review')
			.where('review.projectId = :projectId AND review.agentId = :agentId', {
				projectId,
				agentId,
			})
			.orderBy('review.updatedAt', 'DESC')
			.take(limit);

		if (cursor) {
			query.andWhere('review.updatedAt < :cursor', { cursor: new Date(cursor) });
		}

		return await query.getMany();
	}

	async countByStatus(projectId: string, agentId: string): Promise<AgentReviewSummary> {
		const [total, approved, rejected] = await Promise.all([
			this.countBy({ projectId, agentId }),
			this.countBy({ projectId, agentId, status: 'approved' }),
			this.countBy({ projectId, agentId, status: 'rejected' }),
		]);

		return { total, approved, rejected };
	}

	async deleteByExecutionId(
		projectId: string,
		agentId: string,
		executionId: string,
	): Promise<void> {
		await this.delete({ projectId, agentId, executionId });
	}
}
