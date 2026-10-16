import type { AgentMessage } from '@n8n/agents';
import type { AgentMessageAuthor } from '@n8n/api-types';
import { DateTimeColumn, JsonColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne } from '@n8n/typeorm';

import { AgentThreadEntity } from './agent-thread.entity';

export interface AgentMessageOrigin {
	source: string | null;
	hidden?: boolean;
	integrationConnectionId?: string;
	platformMessageId?: string;
	platformThreadId?: string;
}

@Entity({ name: 'agents_messages' })
@Index(['resourceId', 'threadId'])
// The migration owns this expression index because TypeORM cannot synchronize it.
@Index('IDX_agents_messages_model_context', { synchronize: false })
export class AgentMessageEntity extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 255 })
	threadId: string;

	@Column({ type: 'varchar', length: 255 })
	resourceId: string;

	@Column({ type: 'varchar', length: 36 })
	role: string;

	@Column({ type: 'varchar', length: 36, nullable: true })
	type: string | null;

	@JsonColumn()
	content: AgentMessage;

	@JsonColumn({ nullable: true })
	author: AgentMessageAuthor | null;

	@JsonColumn({ nullable: true })
	origin: AgentMessageOrigin | null;

	/** Enrichment must not replace the original conversation input. */
	@JsonColumn({ nullable: true })
	modelContent: AgentMessage | null;

	/** Null inputs stay out of model history until the runtime consumes them. */
	@DateTimeColumn({ precision: 3, nullable: true })
	modelContextAt: Date | null;

	@ManyToOne(() => AgentThreadEntity, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'threadId' })
	thread: AgentThreadEntity;
}
