import { Column, Entity, Index, ManyToOne, OneToMany } from '@n8n/typeorm';
import type { IDataObject } from 'n8n-workflow';

import { DateTimeColumn, JsonColumn, WithTimestampsAndStringId } from './abstract-entity';
import { AgentEvalDataset } from './agent-eval-dataset.ee';
import type { AgentEvalResult } from './agent-eval-result.ee';

export type AgentEvalRunStatus = 'new' | 'running' | 'completed' | 'error' | 'cancelled';

/**
 * One execution of an {@link AgentEvalDataset} against a specific agent version.
 * Stores run-level status, aggregated metrics, and the cross-main cancellation
 * coordination fields (`runningInstanceId` + `cancelRequested`) proven on
 * {@link TestRun}.
 *
 * `agentId` and `agentVersionId` are plain FK columns (see {@link AgentEvalDataset}
 * for the no-decorator rationale); the FKs are enforced by the migration's raw SQL.
 */
@Entity({ name: 'agent_eval_run' })
export class AgentEvalRun extends WithTimestampsAndStringId {
	@Index()
	@Column('varchar', { length: 36 })
	datasetId: string;

	@ManyToOne('AgentEvalDataset', { onDelete: 'CASCADE' })
	dataset: AgentEvalDataset;

	@Index()
	@Column('varchar', { length: 36 })
	agentId: string;

	/** The published agent version under test — points at an `agent_history` row. */
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
