import { DateTimeColumn } from '@n8n/db';
import { BaseEntity, Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

/** One captured LLM call. ID columns are soft references, so cost history outlives its targets. */
@Entity({ name: 'llm_usage' })
@Index(['finishedAt'])
export class LlmUsage extends BaseEntity {
	/** Call identity: the same provider call always gets the same ID. */
	@PrimaryColumn({ type: 'varchar', length: 64 })
	callId: string;

	@DateTimeColumn({ nullable: true })
	startedAt: Date | null;

	@DateTimeColumn()
	finishedAt: Date;

	@Column({ type: 'int', nullable: true })
	durationMs: number | null;

	@Column({ type: 'varchar', length: 32 })
	callerType: string;

	@Column({ type: 'varchar', length: 32, nullable: true })
	subType: string | null;

	@Column({ type: 'varchar', length: 36, nullable: true })
	workflowId: string | null;

	@Column({ type: 'varchar', length: 36, nullable: true })
	executionId: string | null;

	@Column({ type: 'varchar', length: 32, nullable: true })
	executionMode: string | null;

	@Column({ type: 'text', nullable: true })
	nodeName: string | null;

	@Column({ type: 'text', nullable: true })
	nodeType: string | null;

	@Column({ type: 'varchar', length: 36, nullable: true })
	agentId: string | null;

	/** As long as the agent thread IDs, which carry a scope prefix. */
	@Column({ type: 'varchar', length: 128, nullable: true })
	threadId: string | null;

	@Column({ type: 'varchar', length: 36, nullable: true })
	projectId: string | null;

	@Column({ type: 'uuid', nullable: true })
	userId: string | null;

	/** The user that budgets count: `userId`, else the publisher of the workflow. */
	@Column({ type: 'uuid', nullable: true })
	accountableUserId: string | null;

	@Column({ type: 'varchar', length: 36, nullable: true })
	credentialId: string | null;

	/** The migration limits the column to these values. */
	@Column({ type: 'varchar', length: 32, nullable: true })
	managedBy: 'aiGateway' | 'assistant' | null;

	@Column({ type: 'varchar', length: 64 })
	provider: string;

	@Column({ type: 'varchar', length: 255 })
	model: string;

	@Column({ type: 'varchar', length: 255, nullable: true })
	providerResponseId: string | null;

	@Column({ type: 'int', default: 0 })
	inputTokens: number;

	@Column({ type: 'int', default: 0 })
	outputTokens: number;

	@Column({ type: 'int', default: 0 })
	cacheReadTokens: number;

	@Column({ type: 'int', default: 0 })
	cacheWriteTokens: number;

	@Column({ type: 'double precision', nullable: true })
	estimatedCostUsd: number | null;

	@Column({ type: Boolean, default: false })
	priced: boolean;
}
