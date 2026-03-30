import { WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

@Entity({ name: 'instance_ai_messages' })
export class InstanceAiMessage extends WithTimestamps {
	@PrimaryColumn('varchar')
	id: string;

	@Index()
	@Column({ type: 'varchar' })
	threadId: string;

	@Column({ type: 'text' })
	content: string;

	@Column({ type: 'varchar', length: 16 })
	role: string;

	@Column({ type: 'varchar', length: 32, nullable: true })
	type: string | null;

	@Index()
	@Column({ type: 'varchar', nullable: true })
	resourceId: string | null;
}
