import type { MigrationContext, ReversibleMigration } from '../migration-types';

const BOARD_TABLE = 'task_board';
const COLUMN_TABLE = 'task_board_column';
const TASK_TABLE = 'task_board_task';
const COMMENT_TABLE = 'task_board_comment';

const columnRoles = ['backlog', 'todo', 'in_progress', 'needs_input', 'done'];

/**
 * Task boards: a board has ordered columns and tasks, and each task has a comment thread.
 * Users, agents and workflows write to a board, so the actor and assignee columns hold a
 * type and an id, without a foreign key.
 */
export class CreateTaskBoardTables1794868354308 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await this.createBoardTable(context);
		await this.createColumnTable(context);
		await this.createTaskTable(context);
		await this.createCommentTable(context);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(COMMENT_TABLE);
		await dropTable(TASK_TABLE);
		await dropTable(COLUMN_TABLE);
		await dropTable(BOARD_TABLE);
	}

	private async createBoardTable({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(BOARD_TABLE)
			.withColumns(
				column('id').varchar(36).primary.comment('nanoid, shown in URLs'),
				column('projectId').varchar(36).notNull,
				column('name').varchar(128).notNull,
				column('description').text,
				column('templateKey')
					.varchar(32)
					.comment('Template that created the board, e.g. "agent-dev". NULL = no template'),
				column('workflowId')
					.varchar(36)
					.comment('Dispatcher workflow that reacts to task events. NULL = none'),
			)
			.withTimestamps.withIndexOn(['projectId'])
			.withForeignKey('projectId', { tableName: 'project', columnName: 'id', onDelete: 'CASCADE' })
			// The board stays usable without its dispatcher workflow.
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'SET NULL',
			});
	}

	private async createColumnTable({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(COLUMN_TABLE)
			.withColumns(
				column('id').varchar(36).primary.comment('nanoid'),
				column('boardId').varchar(36).notNull,
				column('name').varchar(128).notNull,
				column('position').int.notNull.comment('Display order, from left to right'),
				column('role')
					.varchar(16)
					.withEnumCheck(columnRoles)
					.comment('What the column means to workflows, independent of its name. NULL = no role'),
			)
			// NULL roles are distinct, so many columns of a board can have no role.
			.withTimestamps.withIndexOn(['boardId', 'role'], true)
			.withForeignKey('boardId', { tableName: BOARD_TABLE, columnName: 'id', onDelete: 'CASCADE' });
	}

	private async createTaskTable({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(TASK_TABLE)
			.withColumns(
				column('id').varchar(36).primary.comment('nanoid, shown in URLs'),
				column('boardId').varchar(36).notNull,
				column('columnId').varchar(36).notNull,
				column('number').int.notNull.comment('Sequential number, unique within the board'),
				column('title').varchar(255).notNull,
				column('description').text.notNull.default("''"),
				column('assigneeType')
					.varchar(16)
					.withEnumCheck(['user', 'agent'])
					.comment('Kind of assignee. NULL = unassigned'),
				column('assigneeId')
					.varchar(36)
					.comment('User id or agent id, read with assigneeType. No foreign key'),
				column('createdByType')
					.varchar(16)
					.notNull.withEnumCheck(['user', 'agent', 'workflow'])
					.comment('Kind of actor that created the task'),
				column('createdById')
					.varchar(36)
					.notNull.comment('User id, agent id or workflow id, read with createdByType'),
				column('position').int.notNull.comment('Display order within the column'),
			)
			.withTimestamps.withIndexOn(['boardId', 'columnId'])
			.withIndexOn(['boardId', 'number'], true)
			.withIndexOn(['columnId'])
			.withForeignKey('boardId', { tableName: BOARD_TABLE, columnName: 'id', onDelete: 'CASCADE' })
			.withForeignKey('columnId', {
				tableName: COLUMN_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			});
	}

	private async createCommentTable({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(COMMENT_TABLE)
			.withColumns(
				column('id').varchar(36).primary.comment('nanoid'),
				column('taskId').varchar(36).notNull,
				column('authorType')
					.varchar(16)
					.notNull.withEnumCheck(['user', 'agent', 'workflow'])
					.comment('Kind of actor that wrote the comment'),
				column('authorId')
					.varchar(36)
					.notNull.comment('User id, agent id or workflow id, read with authorType'),
				column('body').text.notNull,
			)
			.withTimestamps.withIndexOn(['taskId'])
			.withForeignKey('taskId', { tableName: TASK_TABLE, columnName: 'id', onDelete: 'CASCADE' });
	}
}
