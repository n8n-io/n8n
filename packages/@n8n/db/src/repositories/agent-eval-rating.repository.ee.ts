import { Service } from '@n8n/di';
import { DataSource, In, Repository } from '@n8n/typeorm';
import type { JsonObject } from 'n8n-workflow';

import { AgentEvalRating, AgentEvalResult } from '../entities';
import type { AgentEvalVote } from '../entities/agent-eval-rating.ee';

// Mirrors the seeding chunk size, for the driver's bound parameter limit.
const ID_LOOKUP_CHUNK_SIZE = 100;

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
	 * Newest rating per result in a run. Reduced here, not in SQL: `DISTINCT ON` is
	 * Postgres-only and `MAX(createdAt)` returns both rows on a millisecond tie.
	 */
	async findLatestByRunId(runId: string): Promise<AgentEvalRating[]> {
		// Ids only — whole rows would load every superseded `correction` just to drop it.
		const rows = await this.createQueryBuilder('rating')
			.select('rating.id', 'id')
			.addSelect('rating.resultId', 'resultId')
			.innerJoin(AgentEvalResult, 'result', 'result.id = rating.resultId')
			.where('result.runId = :runId', { runId })
			.orderBy('rating.resultId', 'ASC')
			.addOrderBy('rating.createdAt', 'DESC')
			.addOrderBy('rating.id', 'DESC')
			.getRawMany<{ id: string; resultId: string }>();

		const seen = new Set<string>();
		const latestIds = rows
			.filter((row) => {
				if (seen.has(row.resultId)) return false;
				seen.add(row.resultId);
				return true;
			})
			.map((row) => row.id);
		if (latestIds.length === 0) return [];

		// Fetch the winners, then restore the id order the query established.
		const found: AgentEvalRating[] = [];
		for (let i = 0; i < latestIds.length; i += ID_LOOKUP_CHUNK_SIZE) {
			const chunk = latestIds.slice(i, i + ID_LOOKUP_CHUNK_SIZE);
			found.push(...(await this.find({ where: { id: In(chunk) } })));
		}

		const byId = new Map(found.map((rating) => [rating.id, rating]));
		return latestIds
			.map((id) => byId.get(id))
			.filter((rating): rating is AgentEvalRating => rating !== undefined);
	}
}
