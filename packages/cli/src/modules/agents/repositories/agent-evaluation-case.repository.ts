import type { AgentEvaluationVersionSummary, AgentReviewSummary } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { DataSource, In, Repository } from '@n8n/typeorm';

import { AgentEvaluationCase } from '../entities/agent-evaluation-case.entity';

@Service()
export class AgentEvaluationCaseRepository extends Repository<AgentEvaluationCase> {
	constructor(dataSource: DataSource) {
		super(AgentEvaluationCase, dataSource.manager);
	}

	async findByExecutionIds(
		executionIds: string[],
		agentVersionId: string,
	): Promise<AgentEvaluationCase[]> {
		if (executionIds.length === 0) return [];

		return await this.find({ where: { executionId: In(executionIds), agentVersionId } });
	}

	async findByExecutionId(
		projectId: string,
		agentId: string,
		executionId: string,
	): Promise<AgentEvaluationCase | null> {
		return await this.findOne({ where: { projectId, agentId, executionId } });
	}

	async findByExecutionIdAndVersion(
		projectId: string,
		agentId: string,
		executionId: string,
		agentVersionId: string,
	): Promise<AgentEvaluationCase | null> {
		return await this.findOne({ where: { projectId, agentId, executionId, agentVersionId } });
	}

	async findByAgent(
		projectId: string,
		agentId: string,
		agentVersionId: string,
		limit: number,
		cursor?: string,
	): Promise<AgentEvaluationCase[]> {
		const query = this.createQueryBuilder('review')
			.where(
				'review.projectId = :projectId AND review.agentId = :agentId AND review.agentVersionId = :agentVersionId',
				{
					projectId,
					agentId,
					agentVersionId,
				},
			)
			.orderBy('review.updatedAt', 'DESC')
			.take(limit);

		if (cursor) {
			query.andWhere('review.updatedAt < :cursor', { cursor: new Date(cursor) });
		}

		return await query.getMany();
	}

	async countByStatus(
		projectId: string,
		agentId: string,
		agentVersionId: string,
	): Promise<AgentReviewSummary> {
		const [total, approved, rejected] = await Promise.all([
			this.countBy({ projectId, agentId, agentVersionId }),
			this.countBy({ projectId, agentId, agentVersionId, status: 'approved' }),
			this.countBy({ projectId, agentId, agentVersionId, status: 'rejected' }),
		]);

		return { total, approved, rejected };
	}

	async summarizeVersions(
		projectId: string,
		agentId: string,
	): Promise<
		Array<
			Pick<
				AgentEvaluationVersionSummary,
				'agentVersionId' | 'total' | 'approved' | 'rejected' | 'updatedAt'
			>
		>
	> {
		const rows = await this.createQueryBuilder('review')
			.select('review.agentVersionId', 'agentVersionId')
			.addSelect('COUNT(*)', 'total')
			.addSelect("SUM(CASE WHEN review.status = 'approved' THEN 1 ELSE 0 END)", 'approved')
			.addSelect("SUM(CASE WHEN review.status = 'rejected' THEN 1 ELSE 0 END)", 'rejected')
			.addSelect('MAX(review.updatedAt)', 'updatedAt')
			.where('review.projectId = :projectId AND review.agentId = :agentId', {
				projectId,
				agentId,
			})
			.groupBy('review.agentVersionId')
			.orderBy('MAX(review.updatedAt)', 'DESC')
			.getRawMany<{
				agentVersionId: string;
				total: string | number;
				approved: string | number | null;
				rejected: string | number | null;
				updatedAt: Date | string | null;
			}>();

		return rows.map((row) => ({
			agentVersionId: row.agentVersionId,
			total: Number(row.total),
			approved: Number(row.approved ?? 0),
			rejected: Number(row.rejected ?? 0),
			updatedAt:
				row.updatedAt instanceof Date ? row.updatedAt.toISOString() : (row.updatedAt ?? null),
		}));
	}

	async deleteByExecutionId(
		projectId: string,
		agentId: string,
		executionId: string,
		agentVersionId: string,
	): Promise<void> {
		await this.delete({ projectId, agentId, executionId, agentVersionId });
	}
}
