import { WithTimestamps } from '@n8n/db';
import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

@Entity('project_execution_limit')
export class ProjectExecutionLimit extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	projectId: string;

	@Column({ type: 'int' })
	maxExecutions: number;
}
