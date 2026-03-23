import { WithTimestamps } from '@n8n/db';
import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

@Entity({ name: 'instance_ai_workflow_snapshots' })
export class InstanceAiWorkflowSnapshot extends WithTimestamps {
	@PrimaryColumn('varchar')
	runId: string;

	@PrimaryColumn('varchar')
	workflowName: string;

	@Column({ type: 'varchar', nullable: true })
	resourceId: string | null;

	@Column({ type: 'varchar', nullable: true })
	status: string | null;

	@Column({ type: 'text' })
	snapshot: string;
}
