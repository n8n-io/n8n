import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';
import { Project } from './project';

/** Workflow review settings of a team project. A project without a row uses the defaults. */
@Entity({ name: 'project_workflow_review_settings' })
export class ProjectWorkflowReviewSettings extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	projectId: string;

	@OneToOne('Project', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'projectId' })
	project: Project;

	/** Set by a project admin. Applies only when the instance requires approval "When configured". */
	@Column({ default: false })
	requiredByProject: boolean;

	/** Set by an instance admin for this project. Requires a review whatever `requiredByProject` says. */
	@Column({ default: false })
	requiredByInstance: boolean;
}
