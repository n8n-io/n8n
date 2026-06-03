import { WithTimestamps, JsonColumn, Project } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

@Entity({ name: 'instance_ai_threads' })
export class InstanceAiThread extends WithTimestamps {
	@PrimaryColumn('uuid')
	id: string;

	@Index()
	@Column({ type: 'varchar', length: 255 })
	resourceId: string;

	@ManyToOne(() => Project, { onDelete: 'CASCADE', nullable: true })
	@JoinColumn({ name: 'projectId' })
	project: Project | null;

	@Index()
	@Column({ type: 'varchar', length: 255, nullable: true })
	projectId: string | null;

	@Column({ type: 'text', default: '' })
	title: string;

	@JsonColumn({ nullable: true })
	metadata: Record<string, unknown> | null;
}
