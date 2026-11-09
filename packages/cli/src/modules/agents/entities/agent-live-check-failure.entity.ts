import { WithCreatedAt } from '@n8n/db';
import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
	Relation,
} from '@n8n/typeorm';

import type { AgentExecution } from './agent-execution.entity';

/**
 * A code check that failed on a live execution of a published agent. Passes
 * write nothing: the executions a version ran are the denominator.
 */
@Entity({ name: 'agent_live_check_failure' })
@Index(['agentVersionId', 'checkId'])
@Index(['agentId'])
export class AgentLiveCheckFailure extends WithCreatedAt {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	executionId: string;

	@PrimaryColumn({ type: 'varchar', length: 32 })
	checkId: string;

	@Column({ type: 'varchar', length: 36 })
	agentId: string;

	@Column({ type: 'varchar', length: 36 })
	agentVersionId: string;

	@Column({ type: 'text' })
	reason: string;

	@ManyToOne('AgentExecution', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'executionId' })
	execution: Relation<AgentExecution>;
}
