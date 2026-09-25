import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'instance_ai_thread_tabs';

export class CreateInstanceAiThreadTabsTable1790342771626 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(table)
			.withColumns(
				column('threadId').uuid.primary,
				column('userId').uuid.primary,
				column('state').json.notNull.comment(
					'Tabs the user has open in the thread: { tabs, closedTabs, activeTab }. ' +
						'"tabs" is in display order. "closedTabs" holds closed artifacts so they do not reopen.',
				),
			)
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
