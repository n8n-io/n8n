import type { IrreversibleMigration, MigrationContext } from '../migration-types';

const TABLE_NAME = 'agents_observation_locks';
const TEMP_TABLE_NAME = 'agents_observation_locks_temp';
const TASK_KIND_CHECK = 'taskKind';

export class RemoveAgentObservationLockTaskKindCheck1784000000004 implements IrreversibleMigration {
	async up({
		isSqlite,
		isPostgres,
		tablePrefix,
		escape,
		copyTable,
		queryRunner,
		schemaBuilder: { createTable, column, dropTable },
	}: MigrationContext) {
		if (isSqlite) {
			const tempTableName = escape.tableName(TEMP_TABLE_NAME);
			const tableName = escape.tableName(TABLE_NAME);

			await createTable(TEMP_TABLE_NAME).withColumns(
				column('scopeKind').varchar(20).notNull.primary.withEnumCheck(['thread', 'resource']),
				column('scopeId').varchar(255).notNull.primary,
				column('taskKind').varchar(64).notNull.primary,
				column('holderId').varchar(64).notNull,
				column('heldUntil').timestampTimezone(3).notNull,
			).withTimestamps;

			await copyTable(TABLE_NAME, TEMP_TABLE_NAME);
			await dropTable(TABLE_NAME);
			await queryRunner.query(`ALTER TABLE ${tempTableName} RENAME TO ${tableName};`);
			return;
		}

		if (isPostgres) {
			const tableName = escape.tableName(TABLE_NAME);
			const constraintName = escape.columnName(
				`CHK_${tablePrefix}${TABLE_NAME}_${TASK_KIND_CHECK}`,
			);
			await queryRunner.query(
				`ALTER TABLE ${tableName} DROP CONSTRAINT IF EXISTS ${constraintName}`,
			);
		}
	}
}
