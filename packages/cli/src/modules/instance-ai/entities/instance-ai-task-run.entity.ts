import { JsonColumn, WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';
import type { InstanceAiTaskRun } from '@n8n/api-types';

@Entity({ name: 'instance_ai_task_runs' })
export class InstanceAiTaskRunEntity extends WithTimestamps {
	@PrimaryColumn('varchar')
	taskId: string;

	@Index()
	@Column({ type: 'varchar' })
	threadId: string;

	@Column({ type: 'varchar' })
	originRunId: string;

	@Index()
	@Column({ type: 'varchar', nullable: true })
	messageGroupId: string | null;

	@Column({ type: 'varchar' })
	agentId: string;

	@Column({ type: 'varchar' })
	role: string;

	@Column({ type: 'varchar' })
	kind: string;

	@Column({ type: 'varchar' })
	status: string;

	@Index()
	@Column({ type: 'varchar', nullable: true })
	planId: string | null;

	@Index()
	@Column({ type: 'varchar', nullable: true })
	phaseId: string | null;

	@Column({ type: 'bigint' })
	sortUpdatedAt: string;

	@JsonColumn()
	data: InstanceAiTaskRun;
}
