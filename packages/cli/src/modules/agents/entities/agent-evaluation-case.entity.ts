import type { AgentReviewRejectionReason, AgentReviewStatus } from '@n8n/api-types';
import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne } from '@n8n/typeorm';

import type { Agent } from './agent.entity';
import { AgentExecution } from './agent-execution.entity';

@Entity({ name: 'agent_evaluation_case' })
@Index(['agentId', 'status', 'updatedAt'])
@Index(['agentId', 'agentVersionId', 'status', 'updatedAt'])
@Index(['executionId'], { unique: true })
export class AgentEvaluationCase extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 255 })
	projectId: string;

	@Column({ type: 'varchar', length: 36 })
	agentId: string;

	@Column({ type: 'varchar', length: 255 })
	agentVersionId: string;

	@ManyToOne('Agent', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'agentId' })
	agent: Agent;

	@Column({ type: 'varchar', length: 36 })
	executionId: string;

	@ManyToOne(() => AgentExecution, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'executionId' })
	execution: AgentExecution;

	@Column({ type: 'varchar', length: 16 })
	status: AgentReviewStatus;

	@Column({ type: 'varchar', length: 32, nullable: true })
	rejectionReason: AgentReviewRejectionReason | null;

	@Column({ type: 'text' })
	input: string;

	@Column({ type: 'text' })
	expectedOutput: string;

	@Column({ type: 'text' })
	actualOutput: string;

	@Column({ type: 'text', nullable: true })
	notes: string | null;

	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;

	@Column({ type: 'uuid', nullable: true })
	updatedById: string | null;
}
