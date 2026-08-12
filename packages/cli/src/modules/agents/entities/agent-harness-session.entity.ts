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

export type AgentHarnessSessionStatus = 'idle' | 'claimed';

@Entity({ name: 'agent_harness_sessions' })
@Index(['expiresAt'])
export class AgentHarnessSession extends WithTimestamps {
	@PrimaryColumn({
		type: 'varchar',
		length: 36,
		comment: 'Agent that owns the native harness session',
	})
	agentId: string;

	@ManyToOne(() => Agent, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'agentId' })
	agent: Relation<Agent>;

	@PrimaryColumn({
		type: 'varchar',
		length: 255,
		comment: 'Conversation thread bound to the session',
	})
	threadId: string;

	@PrimaryColumn({
		type: 'varchar',
		length: 64,
		comment: 'Hash of execution-affecting agent and harness configuration',
	})
	runtimeIdentity: string;

	@Column({ type: 'varchar', length: 255, comment: 'Memory resource scope for the thread' })
	resourceId: string;

	@Column({
		type: 'varchar',
		length: 32,
		comment: 'Harness adapter that produced the opaque session state',
	})
	adapter: string;

	@Column({ type: 'varchar', length: 255, comment: 'Native harness session identifier' })
	sessionId: string;

	@Column({
		type: 'text',
		nullable: true,
		comment: 'Opaque serialized harness resume or continuation state',
	})
	state: string | null;

	@Column({
		type: 'varchar',
		length: 16,
		default: 'idle',
		comment: 'Whether a process currently owns the session',
	})
	status: AgentHarnessSessionStatus;

	@Column({
		type: 'int',
		default: 0,
		comment: 'Monotonic fencing epoch incremented for every successful claim',
	})
	ownershipEpoch: number;

	@Column({
		type: 'uuid',
		nullable: true,
		comment: 'Ephemeral token held by the current session owner',
	})
	claimToken: string | null;

	@DateTimeColumn({
		nullable: true,
		comment: 'Time after which another process may claim the session',
	})
	claimExpiresAt: Date | null;

	@DateTimeColumn({ comment: 'Time of the latest saved turn state' })
	lastUsedAt: Date;

	@DateTimeColumn({ comment: 'Time after which the session may be pruned' })
	expiresAt: Date;
}
