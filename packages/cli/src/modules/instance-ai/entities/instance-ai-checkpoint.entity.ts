import { WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

@Entity({ name: 'instance_ai_checkpoints' })
export class InstanceAiCheckpoint extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 255 })
	key: string;

	@Index()
	@Column({ type: 'varchar', length: 255, nullable: true })
	runId: string | null;

	@Index()
	@Column({ type: 'uuid', nullable: true })
	threadId: string | null;

	@Index()
	@Column({ type: 'varchar', length: 255, nullable: true })
	resourceId: string | null;

	@Column({ type: 'text' })
	state: string;
}
