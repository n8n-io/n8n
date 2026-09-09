import { JsonColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, JoinColumn, ManyToOne } from '@n8n/typeorm';

import { AgentThreadEntity } from './agent-thread.entity';

@Entity({ name: 'agents_messages' })
export class AgentMessageEntity extends WithTimestampsAndStringId {
	/** Holds an `agents_threads.id`, so it matches that column's width. */
	@Column({ type: 'varchar', length: 128 })
	threadId: string;

	@Column({ type: 'varchar', length: 255 })
	resourceId: string;

	@Column({ type: 'varchar', length: 36 })
	role: string;

	@Column({ type: 'varchar', length: 36, nullable: true })
	type: string | null;

	@JsonColumn()
	content: Record<string, unknown>;

	@ManyToOne(() => AgentThreadEntity, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'threadId' })
	thread: AgentThreadEntity;
}
