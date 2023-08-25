import { Column } from '@/databases/dsl/Column';
import type { MigrationContext, ReversibleMigration } from '@db/types';

const tableName = 'workflow_history';

export class CreateWorkflowHistoryTable1692967111175 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable }, queryRunner }: MigrationContext) {
		const columns = [
			new Column('versionId').uuid.primary.notNull,
			new Column('workflowId').varchar(36).notNull,
			new Column('nodes').text.notNull,
			new Column('connections').text.notNull,
			new Column('authors').varchar(255).notNull,
		];

		await createTable(tableName)
			.withColumns(...columns)
			.withTimestamps.withIndexOn('workflowId')
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.execute(queryRunner);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(tableName);
	}
}
