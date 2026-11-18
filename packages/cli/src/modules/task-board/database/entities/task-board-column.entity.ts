import type { TaskBoardColumnRole } from '@n8n/api-types';
import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index } from '@n8n/typeorm';

@Entity({ name: 'task_board_column' })
@Index(['boardId', 'role'], { unique: true })
export class TaskBoardColumnEntity extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 36 })
	boardId: string;

	@Column({ type: 'varchar', length: 128 })
	name: string;

	@Column({ type: 'int' })
	position: number;

	@Column({ type: 'varchar', length: 16, nullable: true })
	role: TaskBoardColumnRole | null;
}
