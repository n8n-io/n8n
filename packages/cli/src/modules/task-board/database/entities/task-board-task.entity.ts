import type {
	TaskBoardActorType,
	TaskBoardAssigneeType,
	TaskBoardSeverity,
	TaskBoardUsageTotals,
} from '@n8n/api-types';
import { JsonColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index } from '@n8n/typeorm';

/** The usage of one agent on the task, as the `agentUsage` column stores it. */
export type TaskBoardStoredAgentUsage = TaskBoardUsageTotals & { agentId: string; runs: number };

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

	@Column({ type: 'varchar', length: 16, nullable: true })
	severity: TaskBoardSeverity | null;

	/** Lower case, without duplicates. */
	@JsonColumn({ default: '[]' })
	tags: string[];

	/** Agent hand-offs since a person last commented on or assigned the task. */
	@Column({ type: 'smallint', default: 0 })
	handoffCount: number;

	/** One item for each agent that ran on the task. The task totals are the sum of the items. */
	@JsonColumn({ default: '[]' })
	agentUsage: TaskBoardStoredAgentUsage[];
}
