import type { TaskBoardActorType, TaskBoardAssigneeType } from '@n8n/api-types';
import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index } from '@n8n/typeorm';

@Entity({ name: 'task_board_task' })
@Index(['boardId', 'columnId'])
@Index(['boardId', 'taskNumber'], { unique: true })
@Index(['columnId'])
export class TaskBoardTaskEntity extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 36 })
	boardId: string;

	@Column({ type: 'varchar', length: 36 })
	columnId: string;

	/** Sequential within the board. The API calls it `number`. */
	@Column({ name: 'number', type: 'int' })
	taskNumber: number;

	@Column({ type: 'varchar', length: 255 })
	title: string;

	@Column({ type: 'text', default: '' })
	description: string;

	@Column({ type: 'varchar', length: 16, nullable: true })
	assigneeType: TaskBoardAssigneeType | null;

	@Column({ type: 'varchar', length: 36, nullable: true })
	assigneeId: string | null;

	@Column({ type: 'varchar', length: 16 })
	createdByType: TaskBoardActorType;

	@Column({ type: 'varchar', length: 36 })
	createdById: string;

	@Column({ type: 'int' })
	position: number;
}
