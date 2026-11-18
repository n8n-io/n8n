import { WithCreatedAt } from '@n8n/db';
import { Entity, Index, PrimaryColumn } from '@n8n/typeorm';

/** One agent on the team of one board. The foreign keys delete the row with either side. */
@Entity({ name: 'task_board_agent' })
@Index(['agentId'])
export class TaskBoardAgentEntity extends WithCreatedAt {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	boardId: string;

	@PrimaryColumn({ type: 'varchar', length: 36 })
	agentId: string;
}
