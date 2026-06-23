import {
	Column,
	Entity,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
	Relation,
} from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';
import type { ProjectEnvironment } from './project-environment';
import type { WorkflowEntity } from './workflow-entity';

@Entity({ name: 'workflow_published_environment_version' })
export class WorkflowPublishedEnvironmentVersion extends WithTimestamps {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar', length: 36 })
	workflowId: string;

	@Column({ type: 'varchar', length: 36 })
	environmentId: string;

	@Column({ type: 'varchar', length: 36 })
	publishedVersionId: string;

	@ManyToOne('WorkflowEntity', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'workflowId' })
	workflow: Relation<WorkflowEntity>;

	@ManyToOne('ProjectEnvironment', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'environmentId' })
	environment: Relation<ProjectEnvironment>;
}
