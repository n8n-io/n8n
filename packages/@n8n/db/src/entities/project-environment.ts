import { Column, Entity, ManyToOne, Relation } from '@n8n/typeorm';

import { WithTimestampsAndStringId } from './abstract-entity';
import { Project } from './project';

@Entity()
export class ProjectEnvironment extends WithTimestampsAndStringId {
	@Column({ length: 255 })
	name: string;

	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	@ManyToOne('Project', { onDelete: 'CASCADE' })
	project: Relation<Project>;
}
