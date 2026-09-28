import { WithCreatedAt } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from '@n8n/typeorm';
import type { Relation } from '@n8n/typeorm';

import { AgentExecution } from './agent-execution.entity';
import { AgentMessageEntity } from './agent-message.entity';

/**
 * Stores ordered input and output references for an execution.
 * Continuations can reuse messages. Separate links let the database enforce
 * foreign keys and unique positions without copying message content.
 */
@Entity({ name: 'agent_execution_message_links' })
@Index(['executionId', 'direction', 'position'], { unique: true })
@Index(['messageId'])
export class AgentExecutionMessageLink extends WithCreatedAt {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	executionId: string;

	@PrimaryColumn({ type: 'varchar', length: 36 })
	messageId: string;

	@Column({ type: 'varchar', length: 6 })
	direction: 'input' | 'output';

	@Column({ type: 'int' })
	position: number;

	@ManyToOne(() => AgentExecution, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'executionId' })
	execution: Relation<AgentExecution>;

	@ManyToOne(() => AgentMessageEntity, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'messageId' })
	message: Relation<AgentMessageEntity>;
}
