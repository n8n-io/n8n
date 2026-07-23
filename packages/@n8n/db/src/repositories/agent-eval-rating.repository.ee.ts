import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';
import type { JsonObject } from 'n8n-workflow';

import { AgentEvalRating } from '../entities';
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
}
