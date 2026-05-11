import { WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

@Entity({ name: 'instance_ai_messages' })
export class InstanceAiMessage extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	id: string;

	@Index()
	@Column({ type: 'uuid' })
	threadId: string;

	@Column({ type: 'text' })
	content: string;

	@Column({ type: 'varchar', length: 16 })
	role: string;

	@Column({ type: 'varchar', length: 32, nullable: true })
	type: string | null;

	@Index()
	@Column({ type: 'varchar', length: 255, nullable: true })
	resourceId: string | null;
}
