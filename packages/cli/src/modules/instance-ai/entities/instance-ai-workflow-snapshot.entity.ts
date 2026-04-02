import { WithTimestamps } from '@n8n/db';
import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

@Entity({ name: 'instance_ai_workflow_snapshots' })
export class InstanceAiWorkflowSnapshot extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	runId: string;

	@PrimaryColumn({ type: 'varchar', length: 255 })
	workflowName: string;

	@Column({ type: 'varchar', length: 255, nullable: true })
	resourceId: string | null;

	@Column({ type: 'varchar', nullable: true })
	status: string | null;

	@Column({ type: 'text' })
	snapshot: string;
}
