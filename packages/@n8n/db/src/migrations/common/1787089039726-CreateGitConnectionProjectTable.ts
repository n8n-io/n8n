import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE = 'git_connection_project';
const PROJECT_TABLE = 'project';
const GIT_CONNECTION_TABLE = 'git_connection';

export class CreateGitConnectionProjectTable1787089039726 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		// projectId is the primary key: a project can be linked to at most one
		// connection, while a connection can hold many project links. Both FKs
		// cascade so a link disappears when either side is deleted.
		await createTable(TABLE)
			.withColumns(
				column('projectId').varchar(36).primary,
				column('gitConnectionId').varchar(36).notNull,
			)
			.withForeignKey('projectId', {
				tableName: PROJECT_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('gitConnectionId', {
				tableName: GIT_CONNECTION_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			// A connection holds many projects; index the FK for connection-scoped
			// reads ("list projects for this connection") and the cascade delete.
			.withIndexOn(['gitConnectionId']).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(TABLE);
	}
}
