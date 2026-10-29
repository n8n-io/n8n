import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE = 'project_execution_limit';

export class CreateProjectExecutionLimitTable1793271136710 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column }, tablePrefix }: MigrationContext) {
		await createTable(TABLE)
			.withColumns(column('projectId').varchar(36).primary, column('pauseAfter').int.notNull)
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}${TABLE}_projectId`,
			})
			.withCheck(`CHK_${tablePrefix}${TABLE}_pause_positive`, '"pauseAfter" > 0').withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(TABLE);
	}
}
