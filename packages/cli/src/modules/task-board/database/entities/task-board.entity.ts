import type { TaskBoardTemplateKey } from '@n8n/api-types';
import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index } from '@n8n/typeorm';

@Entity({ name: 'task_board' })
@Index(['projectId'])
export class TaskBoardEntity extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	@Column({ type: 'varchar', length: 128 })
	name: string;

	@Column({ type: 'text', nullable: true })
	description: string | null;

	@Column({ type: 'varchar', length: 32, nullable: true })
	templateKey: TaskBoardTemplateKey | null;

	@Column({ type: 'varchar', length: 36, nullable: true })
	workflowId: string | null;
}
