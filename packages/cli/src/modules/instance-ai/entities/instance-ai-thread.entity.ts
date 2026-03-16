import { WithTimestamps, JsonColumn } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

@Entity({ name: 'instance_ai_threads' })
export class InstanceAiThread extends WithTimestamps {
	@PrimaryColumn('varchar')
	id: string;

	@Index()
	@Column({ type: 'varchar' })
	resourceId: string;

	@Column({ type: 'text', default: '' })
	title: string;

	@JsonColumn({ nullable: true })
	metadata: Record<string, unknown> | null;
}
