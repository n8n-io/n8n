import type { ApprovalSuspendPayload, JSONValue } from '@n8n/agents';
import type { SubAgentTaskDifficulty } from '@n8n/api-types';
import { DateTimeColumn, JsonColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index } from '@n8n/typeorm';

export type AgentBackgroundJobKind = 'subagent' | 'workflow';
export type AgentBackgroundJobStatus = 'running' | 'completed' | 'failed' | 'cancelled';

/** What `check_background_jobs` needs to proxy the approval and continue the child. */
export interface AgentBackgroundJobSuspension {
	childRunId: string;
	childToolCallId: string;
	childAgentId: string;
	/** The child's approval request; `args` are pinned to JSON because the column stores them. */
	suspendPayload: Omit<ApprovalSuspendPayload, 'args'> & { args?: JSONValue };
	taskPath: string;
	resumeContext: JSONValue;
	goal: string;
	difficulty?: SubAgentTaskDifficulty;
}

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

	@JsonColumn({ nullable: true })
	suspension: AgentBackgroundJobSuspension | null;
}
