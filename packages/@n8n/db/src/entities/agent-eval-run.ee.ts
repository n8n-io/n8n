import { Column, Entity, Index, ManyToOne, OneToMany } from '@n8n/typeorm';
import type { IDataObject } from 'n8n-workflow';

import { DateTimeColumn, JsonColumn, WithTimestampsAndStringId } from './abstract-entity';
import { AgentEvalDataset } from './agent-eval-dataset.ee';
import type { AgentEvalResult } from './agent-eval-result.ee';

export type AgentEvalRunStatus = 'new' | 'running' | 'completed' | 'error' | 'cancelled';

/**
 * One execution of an {@link AgentEvalDataset} against a specific agent version.
 * The agent under test is the dataset's agent — it is not duplicated here, so a
 * run can never disagree with its dataset about which agent it targets. Stores
 * run-level status, aggregated metrics, and the cross-main cancellation
 * coordination fields (`runningInstanceId` + `cancelRequested`) proven on
 * {@link TestRun}.
 */
@Entity({ name: 'agent_eval_run' })
export class AgentEvalRun extends WithTimestampsAndStringId {
	@Index()
	@Column('varchar', { length: 36 })
	datasetId: string;

	@ManyToOne('AgentEvalDataset', { onDelete: 'CASCADE' })
	dataset: AgentEvalDataset;

	/**
	 * The published agent version under test — a loose pointer to an
	 * `agent_history` row, with no FK so a run survives history pruning (mirrors
	 * `TestRun.workflowVersionId`). Not enforced at the DB level: callers must
	 * pin a version of the dataset's own agent.
	 */
	@Column('varchar', { length: 36, nullable: true })
	agentVersionId: string | null;

	@Column('varchar')
	status: AgentEvalRunStatus;

	@DateTimeColumn({ nullable: true })
	runAt: Date | null;

	@DateTimeColumn({ nullable: true })
	completedAt: Date | null;

	@JsonColumn({ nullable: true })
	metrics: IDataObject | null;

	@Column('varchar', { length: 255, nullable: true })
	errorCode: string | null;

	@JsonColumn({ nullable: true })
	errorDetails: IDataObject | null;

	/**
	 * ID of the instance running this eval. Used to coordinate cancellation
	 * across multiple main instances. See {@link TestRun.runningInstanceId}.
	 */
	@Column('varchar', { length: 255, nullable: true })
	runningInstanceId: string | null;

	/**
	 * Fallback cancellation flag when the running instance can't be reached via
	 * pub/sub. See {@link TestRun.cancelRequested}.
	 */
	@Column('boolean', { default: false })
	cancelRequested: boolean;

	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;

	@OneToMany('AgentEvalResult', 'run')
	results: AgentEvalResult[];
}
