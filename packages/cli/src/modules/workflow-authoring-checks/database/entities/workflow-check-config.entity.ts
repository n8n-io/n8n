import { WithTimestamps } from '@n8n/db';
import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

import type { WorkflowAuthoringCheckSeverity } from '../../workflow-authoring-checks.types';

@Entity({ name: 'workflow_check_config' })
export class WorkflowCheckConfig extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 255 })
	checkId: string;

	@Column({ type: 'boolean', default: true })
	enabled: boolean;

	@Column({ type: 'varchar', length: 32, nullable: true })
	severityOverride: WorkflowAuthoringCheckSeverity | null;
}
