import { Column, Entity, Index, ManyToOne } from '@n8n/typeorm';
import type { JsonObject } from 'n8n-workflow';

import { JsonColumn, WithTimestampsAndStringId } from './abstract-entity';
import { AgentEvalResult } from './agent-eval-result.ee';

export type AgentEvalVote = 'up' | 'down';

/**
 * A human's rating of an {@link AgentEvalResult}: a 👍/👎 vote plus an optional
 * correction (an edited "should have been" output) and free-text comment.
 * Multiple ratings per result are allowed (per-user history); `ratedById` is a
 * plain FK column (see {@link AgentEvalDataset} for the no-decorator rationale).
 */
@Entity({ name: 'agent_eval_rating' })
export class AgentEvalRating extends WithTimestampsAndStringId {
	@Index()
	@Column('varchar', { length: 36 })
	resultId: string;

	@ManyToOne('AgentEvalResult', { onDelete: 'CASCADE' })
	result: AgentEvalResult;

	@Column('varchar', { length: 8 })
	vote: AgentEvalVote;

	@Column('text', { nullable: true })
	comment: string | null;

	@JsonColumn({ nullable: true })
	correction: JsonObject | null;

	@Column({ type: 'uuid', nullable: true })
	ratedById: string | null;
}
