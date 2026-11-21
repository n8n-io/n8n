import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'assistant_usage_event';

/**
 * Usage log of the n8n Assistant for the admin usage page. Rows outlive the
 * Assistant threads and the resources they name, so thread and resource IDs
 * have no foreign key. A system task deletes rows past the retention period.
 */
export class CreateAssistantUsageEventTable1795242430000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, createIndex, column }, escape }: MigrationContext) {
		await createTable(tableName)
			.withColumns(
				column('id').int.primary.autoGenerate2,
				column('type')
					.varchar(32)
					.notNull.withEnumCheck([
						'message',
						'workflow-created',
						'agent-created',
						'data-table-created',
					])
					.comment('message: a user sent a message. *-created: the Assistant created a resource'),
				column('userId').uuid.comment('User of the conversation. NULL after the user is deleted'),
				column('threadId')
					.varchar(128)
					.notNull.comment(
						'Agents runtime thread of the conversation. Kept after the thread is deleted',
					),
				column('projectId')
					.varchar(36)
					.comment(
						'Project of the created resource, else the working project of the thread. NULL after the project is deleted',
					),
				column('resourceId')
					.varchar(64)
					.comment(
						'ID of the created resource. NULL for messages. Kept after the resource is deleted',
					),
			)
			.withCreatedAt.withIndexOn('createdAt')
			.withIndexOn(['projectId', 'createdAt'])
			.withIndexOn('userId')
			.withForeignKey('userId', { tableName: 'user', columnName: 'id', onDelete: 'SET NULL' })
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'SET NULL',
			});

		// A resource counts once, however often a tool reports that it created it.
		await createIndex(
			tableName,
			['type', 'resourceId'],
			true,
			undefined,
			`${escape.columnName('resourceId')} IS NOT NULL`,
		);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(tableName);
	}
}
