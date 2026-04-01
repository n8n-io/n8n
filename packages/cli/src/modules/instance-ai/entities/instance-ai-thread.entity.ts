import { WithTimestamps, JsonColumn } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

@Entity({ name: 'instance_ai_threads' })
export class InstanceAiThread extends WithTimestamps {
	@PrimaryColumn('uuid')
	id: string;

	@Index()
	@Column({ type: 'varchar', length: 255 })
	resourceId: string;

	@Column({ type: 'text', default: '' })
	title: string;

	@JsonColumn({ nullable: true })
	metadata: Record<string, unknown> | null;
}
