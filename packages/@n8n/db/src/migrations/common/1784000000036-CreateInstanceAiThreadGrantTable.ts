import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'instance_ai_thread_grants';

export class CreateInstanceAiThreadGrantTable1784000000036 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(table)
			.withColumns(
				column('threadId').uuid.primary,
				column('userId').uuid.primary,
				column('grantKey')
					.varchar(512)
					.primary.comment(
						'Namespaced "always allow" grant the user approved for the thread, e.g. ' +
							'"executions:run:<workflowId>". Wide enough to hold a namespace prefix plus a resource identifier.',
					),
			)
			// `threadId` is the PK prefix (already indexed); index `userId` for its cascade.
			.withIndexOn(['userId'])
			.withForeignKey('threadId', {
				tableName: 'instance_ai_threads',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('userId', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(table);
	}
}
