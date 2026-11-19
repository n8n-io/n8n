import type { TaskBoardActorType } from '@n8n/api-types';
import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index } from '@n8n/typeorm';

@Entity({ name: 'task_board_comment' })
@Index(['taskId'])
export class TaskBoardCommentEntity extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 36 })
	taskId: string;

	@Column({ type: 'varchar', length: 16 })
	authorType: TaskBoardActorType;

	@Column({ type: 'varchar', length: 36 })
	authorId: string;

	@Column({ type: 'text' })
	body: string;
}
