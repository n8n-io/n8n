import { JsonColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity } from '@n8n/typeorm';

import type { WorkflowCheckTypeKey } from '../../workflow-authoring-checks.constants';
import type { WorkflowAuthoringCheckSeverity } from '../../workflow-authoring-checks.types';

@Entity({ name: 'workflow_check' })
export class WorkflowCheck extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 128 })
	name: string;

	@Column({ type: 'varchar', length: 64 })
	type: WorkflowCheckTypeKey;

	@JsonColumn()
	config: Record<string, unknown>;

	@Column({ type: 'boolean', default: true })
	enabled: boolean;

	@Column({ type: 'varchar', length: 32 })
	severity: WorkflowAuthoringCheckSeverity;
}
