import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';
import type { JsonObject } from 'n8n-workflow';

import { AgentEvalRating, AgentEvalResult } from '../entities';
import type { AgentEvalVote } from '../entities/agent-eval-rating.ee';

type CreateAgentEvalRatingAttrs = {
	resultId: string;
	vote: AgentEvalVote;
	comment?: string | null;
	correction?: JsonObject | null;
	ratedById?: string | null;
};

@Service()
export class AgentEvalRatingRepository extends Repository<AgentEvalRating> {
	constructor(dataSource: DataSource) {
		super(AgentEvalRating, dataSource.manager);
	}

	async createRating(attrs: CreateAgentEvalRatingAttrs): Promise<AgentEvalRating> {
		const rating = this.create({
			resultId: attrs.resultId,
			vote: attrs.vote,
			comment: attrs.comment ?? null,
			correction: attrs.correction ?? null,
			ratedById: attrs.ratedById ?? null,
		});

		return await this.save(rating);
	}

	async findByResultId(resultId: string): Promise<AgentEvalRating[]> {
		return await this.find({ where: { resultId }, order: { createdAt: 'DESC' } });
	}

	/**
	 * The newest rating per result across a whole run — the "reopen a reviewed run"
	 * read, and the corrections a later calibration pass consumes.
	 *
	 * Ratings are append-only history (a result can hold several), so the
	 * newest-per-result reduction happens here rather than in SQL: `DISTINCT ON` is
	 * Postgres-only, and a correlated `MAX(createdAt)` returns both rows when two
	 * ratings share a timestamp. Ordering by `id` after `createdAt` keeps the
	 * winner deterministic in that tie.
	 */
	async findLatestByRunId(runId: string): Promise<AgentEvalRating[]> {
		const ratings = await this.createQueryBuilder('rating')
			.innerJoin(AgentEvalResult, 'result', 'result.id = rating.resultId')
			.where('result.runId = :runId', { runId })
			.orderBy('rating.resultId', 'ASC')
			.addOrderBy('rating.createdAt', 'DESC')
			.addOrderBy('rating.id', 'DESC')
			.getMany();

		const seen = new Set<string>();
		return ratings.filter((rating) => {
			if (seen.has(rating.resultId)) return false;
			seen.add(rating.resultId);
			return true;
		});
	}
}
