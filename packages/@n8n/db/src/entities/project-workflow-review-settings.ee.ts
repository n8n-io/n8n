import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';

/** Workflow review settings of a team project. A project without a row uses the defaults. */
@Entity({ name: 'project_workflow_review_settings' })
export class ProjectWorkflowReviewSettings extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	projectId: string;

	/** Set by a project admin. Applies only when the instance requires approval "When configured". */
	@Column({ default: false })
	projectApprovalRequired: boolean;
}
