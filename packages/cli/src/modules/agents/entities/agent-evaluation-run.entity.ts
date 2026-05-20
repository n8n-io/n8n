import type { AgentEvaluationRunCaseResult, AgentEvaluationRunSummary } from '@n8n/api-types';
import { DateTimeColumn, JsonColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne } from '@n8n/typeorm';

import type { Agent } from './agent.entity';

@Entity({ name: 'agent_evaluation_run' })
@Index(['projectId', 'agentId', 'completedAt'])
@Index(['agentId', 'agentVersionId', 'completedAt'])
export class AgentEvaluationRun extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 255 })
	projectId: string;

	@ManyToOne('Agent', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'agentId' })
	agent: Agent;

	@Column({ type: 'varchar', length: 36 })
	agentId: string;

	@Column({ type: 'varchar', length: 255 })
	agentVersionId: string;

	@Column({ type: 'varchar', length: 255 })
	suiteId: string;

	@DateTimeColumn({ precision: 3 })
	startedAt: Date;

	@DateTimeColumn({ precision: 3 })
	completedAt: Date;

	@JsonColumn()
	summary: AgentEvaluationRunSummary;

	@JsonColumn()
	cases: AgentEvaluationRunCaseResult[];

	@JsonColumn()
	warnings: string[];

	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;
}
