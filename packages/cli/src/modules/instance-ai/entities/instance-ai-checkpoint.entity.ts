import { DateTimeColumn, JsonColumn, WithTimestamps } from '@n8n/db';
import type { SerializableAgentState } from '@n8n/instance-ai';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

import { InstanceAiThread } from './instance-ai-thread.entity';

@Entity({ name: 'instance_ai_checkpoints' })
export class InstanceAiCheckpoint extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 255 })
	key: string;

	@Index()
	@Column({ type: 'varchar', length: 255, nullable: true })
	runId: string | null;

	@ManyToOne(() => InstanceAiThread, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'threadId' })
	thread: InstanceAiThread;

	@Index()
	@Column({ type: 'uuid' })
	threadId: string;

	@Index()
	@Column({ type: 'varchar', length: 255, nullable: true })
	resourceId: string | null;

	@JsonColumn({ nullable: true })
	state: SerializableAgentState | null;

	@DateTimeColumn({ precision: 3, nullable: true })
	expiredAt: Date | null;
}
