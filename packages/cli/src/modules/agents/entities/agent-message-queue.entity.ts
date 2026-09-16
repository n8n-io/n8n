import { dbType, idStringifier, JsonColumn, WithTimestamps } from '@n8n/db';
import {
	Column,
	Entity,
	Generated,
	Index,
	JoinColumn,
	ManyToOne,
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
@Index(['executionId'])
@Index(['threadId', 'steeringOrder'], {
	unique: true,
	where: '"steeringOrder" IS NOT NULL',
})
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
	status: 'queued' | 'steering' | 'processing' | 'cancelling' | 'delivered' | 'undelivered';

	@JsonColumn()
	payload: AgentQueuePayload;

	@Column({ type: 'varchar', length: 36, nullable: true })
	executionId: string | null;

	/** SDK run selected for this correction. Null reserves a new parent turn. */
	@Column({
		type: 'varchar',
		length: 255,
		nullable: true,
		comment: 'SDK run selected for this correction. Null reserves a new parent turn.',
	})
	steeringRunId: string | null;

	@Column({
		type: 'int',
		nullable: true,
		comment: 'Order in which Send now actions were accepted for this thread.',
	})
	steeringOrder: number | null;

	@ManyToOne(() => AgentExecution, { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'executionId' })
	execution: Relation<AgentExecution> | null;
}
