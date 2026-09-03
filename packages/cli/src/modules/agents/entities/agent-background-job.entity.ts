import { DateTimeColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index } from '@n8n/typeorm';

export type AgentBackgroundJobKind = 'subagent' | 'workflow';
export type AgentBackgroundJobStatus = 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * Durable registry of background jobs dispatched by top-level agents: detached
 * sub-agent runs and workflow executions parked at Wait nodes. The row is the
 * receipt handed to the model at dispatch and the source of truth for status
 * checks, cancellation and crash reconciliation, so it outlives the chat
 * connection, the parent's turn, and backend restarts.
 */
@Entity({ name: 'agent_background_job' })
@Index(['parentThreadId', 'status'])
@Index(['parentAgentId'])
@Index(['settledAt'])
@Index(['childExecutionId'], { unique: true, where: '"childExecutionId" IS NOT NULL' })
@Index(['timeoutAt'], { where: '"status" = \'running\'' })
export class AgentBackgroundJob extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 16 })
	kind: AgentBackgroundJobKind;

	@Column({ type: 'varchar', length: 16 })
	status: AgentBackgroundJobStatus;

	@Column({ type: 'varchar', length: 36 })
	parentAgentId: string;

	// Thread ids are scoped with prefixes/user ids on some surfaces (e.g.
	// `test-<agentId>:<userId>`), so they exceed a bare uuid — same width as
	// agent_execution_threads.id.
	@Column({ type: 'varchar', length: 128 })
	parentThreadId: string;

	/** Memory resource of the parent run. NULL on rows created before wake delivery. */
	@Column({ type: 'varchar', length: 255, nullable: true })
	parentResourceId: string | null;

	/** Sandbox principal of the parent run. NULL on rows created before wake delivery. */
	@Column({ type: 'varchar', length: 64, nullable: true })
	parentPrincipalHash: string | null;

	/** Task name or workflow name, echoed in status-check listings. */
	@Column({ type: 'varchar', length: 255 })
	title: string;

	/** Sub-agent jobs only. */
	@Column({ type: 'varchar', length: 36, nullable: true })
	subAgentId: string | null;

	/** Sub-agent jobs only; minted at dispatch, links to agent_execution_threads. */
	@Column({ type: 'varchar', length: 128, nullable: true })
	childThreadId: string | null;

	/** Workflow jobs only. */
	@Column({ type: 'varchar', length: 36, nullable: true })
	childExecutionId: string | null;

	/** Workflow jobs only; scopes cancellation. */
	@Column({ type: 'varchar', length: 36, nullable: true })
	workflowId: string | null;

	/** When reconciliation fails the job as timed out; NULL means no timeout. */
	@DateTimeColumn({ precision: 3, nullable: true })
	timeoutAt: Date | null;

	/** Final answer of a settled sub-agent job. */
	@Column({ type: 'text', nullable: true })
	result: string | null;

	@Column({ type: 'text', nullable: true })
	error: string | null;

	@DateTimeColumn({ precision: 3, nullable: true })
	settledAt: Date | null;

	/** When the parent agent consumed this settled job. */
	@DateTimeColumn({ precision: 3, nullable: true })
	notifiedAt: Date | null;
}
