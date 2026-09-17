import { dbType, idStringifier, JsonColumn, WithTimestamps } from '@n8n/db';
import {
	Column,
	Entity,
	Generated,
	Index,
	JoinColumn,
	ManyToOne,
	OneToOne,
	PrimaryColumn,
	type Relation,
} from '@n8n/typeorm';

import { Agent } from './agent.entity';
import { AgentExecution } from './agent-execution.entity';
import type { AgentQueuePayload } from '../agent-message-queue.types';

@Entity({ name: 'agent_message_queue' })
@Index(['threadId', 'status', 'kind', 'id'])
@Index(['status', 'updatedAt'])
@Index(['agentId'])
@Index(['executionId'], { unique: true, where: '"executionId" IS NOT NULL' })
export class AgentMessageQueue extends WithTimestamps {
	@Generated()
	@PrimaryColumn({ type: dbType === 'sqlite' ? 'integer' : 'bigint', transformer: idStringifier })
	id: string;

	@Column({ type: 'varchar', length: 36 })
	agentId: string;

	@ManyToOne(() => Agent, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'agentId' })
	agent: Relation<Agent>;

	// A first message can arrive before its execution thread exists.
	@Column({ type: 'varchar', length: 128 })
	threadId: string;

	@Column({ type: 'varchar', length: 16 })
	source: AgentQueuePayload['source'];

	@Column({ type: 'varchar', length: 16 })
	kind: AgentQueuePayload['kind'];

	@Column({ type: 'varchar', length: 16 })
	status: 'queued' | 'processing';

	@JsonColumn()
	payload: AgentQueuePayload;

	@Column({ type: 'varchar', length: 36, nullable: true })
	executionId: string | null;

	@OneToOne(() => AgentExecution, { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'executionId' })
	execution: Relation<AgentExecution> | null;
}
