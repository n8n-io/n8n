import { WithCreatedAt } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from '@n8n/typeorm';
import type { Relation } from '@n8n/typeorm';

import { AgentExecution } from './agent-execution.entity';
import { AgentMessageEntity } from './agent-message.entity';

@Entity({ name: 'agent_execution_messages' })
@Index(['executionId', 'direction', 'position'], { unique: true })
@Index(['messageId'])
export class AgentExecutionMessage extends WithCreatedAt {
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
