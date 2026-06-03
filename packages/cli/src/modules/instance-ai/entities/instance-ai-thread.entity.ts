import { WithTimestamps, JsonColumn, Project } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

@Entity({ name: 'instance_ai_threads' })
export class InstanceAiThread extends WithTimestamps {
	@PrimaryColumn('uuid')
	id: string;

	@Index()
	@Column({ type: 'varchar', length: 255 })
	resourceId: string;

	/**
	 * The n8n project a user thread is scoped to — the hard scope for the agent's
	 * reads and writes, set once at creation and never updated. Nullable because
	 * internal sub-agent threads are created through the generic memory layer and
	 * inherit their scope from the runtime orchestration context, not this row.
	 * Deleting the project cascades to its threads.
	 */
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
