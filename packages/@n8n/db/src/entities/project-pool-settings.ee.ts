import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';
import { Project } from './project';

@Entity()
export class ProjectPoolSettings extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	projectId: string;

	@OneToOne('Project', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'projectId' })
	project: Project;

	/** Pool all executions in this project route to. `null` means the system default queue. */
	@Column({ type: 'varchar', length: 63, nullable: true })
	defaultPool: string | null;
}
