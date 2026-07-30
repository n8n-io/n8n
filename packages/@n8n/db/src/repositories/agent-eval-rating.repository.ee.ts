import { Service } from '@n8n/di';
import { DataSource, In, Repository } from '@n8n/typeorm';
import type { JsonObject } from 'n8n-workflow';

import { AgentEvalRating, AgentEvalResult } from '../entities';
import type { AgentEvalVote } from '../entities/agent-eval-rating.ee';

// Matches the seeding chunk size: keeps an id lookup under the bound parameter
// limit when a run has many rated results.
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
		// Pass one selects ids only. Loading whole rows here would materialize every
		// superseded rating — each carrying a `correction` blob — just to discard most
		// of them, and a run can hold hundreds of results with unbounded history.
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

		// Pass two fetches only the winners, chunked to stay under the driver's bound
		// parameter limit (SQLite in particular), then restored to pass one's order.
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
