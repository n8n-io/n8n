import { DateTimeColumn, WithTimestamps } from '@n8n/db';
import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
	type Relation,
} from '@n8n/typeorm';

import { Agent } from './agent.entity';

/**
 * Lease that allows one agent turn at a time on a session, shared by all main
 * instances. The row is kept after release and after session deletion, so the
 * epoch of a thread id only increases.
 */
@Entity({ name: 'agent_session_lease' })
@Index(['agentId'])
export class AgentSessionLease extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 128 })
	threadId: string;

	@Column({ type: 'varchar', length: 36 })
	agentId: string;

	@ManyToOne(() => Agent, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'agentId' })
	agent: Relation<Agent>;

	@Column({
		type: 'uuid',
		nullable: true,
		comment: 'Token of the current holder, new for each acquisition; NULL when free',
	})
	ownerToken: string | null;

	@Column({
		type: 'varchar',
		length: 255,
		nullable: true,
		comment: 'Host ID of the main that holds the lease; NULL when free',
	})
	ownerHostId: string | null;

	@Column({ type: 'int', default: 0, comment: 'Incremented on each acquisition and never reset' })
	epoch: number;

	@Column({
		type: 'varchar',
		length: 36,
		nullable: true,
		comment: 'Execution that holds the lease; no foreign key, the lease outlives it',
	})
	executionId: string | null;

	@DateTimeColumn({
		nullable: true,
		comment: 'Database-clock time after which another main can take over; NULL when free',
	})
	expiresAt: Date | null;
}
