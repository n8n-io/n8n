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

import { AgentExecutionThread } from './agent-execution-thread.entity';
import { AgentExecution } from './agent-execution.entity';
import type { AgentQueuedMessage } from '../types/agent-queued-message';

@Entity({ name: 'agent_message_queue' })
@Index(['threadId', 'id'])
@Index(['threadId'], { unique: true, where: '"executionId" IS NOT NULL' })
export class AgentMessageQueue extends WithTimestamps {
	@Generated()
	@PrimaryColumn({
		type: dbType === 'sqlite' ? 'integer' : 'bigint',
		transformer: idStringifier,
		comment: 'Acceptance order; IDs are not reused',
	})
	id: string;

	@ManyToOne(() => AgentExecutionThread, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'threadId' })
	thread: Relation<AgentExecutionThread>;

	@Column({ type: 'varchar', length: 128 })
	threadId: string;

	@Column({ type: 'varchar', length: 32, comment: 'Preview or integration source' })
	source: string;

	@JsonColumn({ comment: 'Input, attachment references, identity, and reply context' })
	payload: AgentQueuedMessage;

	@ManyToOne(() => AgentExecution, { nullable: true, onDelete: 'NO ACTION' })
	@JoinColumn({ name: 'executionId' })
	execution: Relation<AgentExecution> | null;

	@Index()
	@Column({
		type: 'varchar',
		length: 36,
		nullable: true,
		comment: 'Current execution; NULL means pending',
	})
	executionId: string | null;
}
