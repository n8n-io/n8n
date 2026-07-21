import { Column, Entity, Index, ManyToOne, OneToMany } from '@n8n/typeorm';
import type { IDataObject, JsonObject } from 'n8n-workflow';

import { DateTimeColumn, JsonColumn, WithTimestampsAndStringId } from './abstract-entity';
import type { AgentEvalRating } from './agent-eval-rating.ee';
import { AgentEvalRun } from './agent-eval-run.ee';

export type AgentEvalResultStatus = 'new' | 'running' | 'success' | 'error' | 'cancelled';

/**
 * Per-case outcome of an {@link AgentEvalRun}: the agent's output, tool-call
 * timeline, and metrics for one dataset row.
 *
 * Results outlive the dataset they came from (Data Table rows can be edited or
 * deleted), so the case is **snapshotted** into `input` and the origin row is
 * tracked loosely via `sourceRowId` with no FK.
 */
@Entity({ name: 'agent_eval_result' })
export class AgentEvalResult extends WithTimestampsAndStringId {
	@Index()
	@Column('varchar', { length: 36 })
	runId: string;

	@ManyToOne('AgentEvalRun', { onDelete: 'CASCADE' })
	run: AgentEvalRun;

	/** ID of the source dataset row (Data Table / sheet); loose, no FK. */
	@Column('varchar', { length: 255, nullable: true })
	sourceRowId: string | null;

	/**
	 * Sequential index of this case within its run, set when the run is seeded.
	 * Orders pending/running cases before `runAt` is populated.
	 */
	@Column('integer', { nullable: true })
	runIndex: number | null;

	@Column('varchar')
	status: AgentEvalResultStatus;

	@JsonColumn({ nullable: true })
	input: JsonObject | null;

	@JsonColumn({ nullable: true })
	output: JsonObject | null;

	@JsonColumn({ nullable: true })
	toolCalls: JsonObject | null;

	@JsonColumn({ nullable: true })
	metrics: IDataObject | null;

	@DateTimeColumn({ nullable: true })
	runAt: Date | null;

	@DateTimeColumn({ nullable: true })
	completedAt: Date | null;

	@Column('varchar', { length: 255, nullable: true })
	errorCode: string | null;

	@JsonColumn({ nullable: true })
	errorDetails: IDataObject | null;

	@OneToMany('AgentEvalRating', 'result')
	ratings: AgentEvalRating[];
}
