import type { MigrationContext, IrreversibleMigration } from '../migration-types';

const tmpTableName = 'tmp_dynamic_credential_entry';
const tableName = 'dynamic_credential_entry';

export class ExpandSubjectIDColumnLength1769784356000 implements IrreversibleMigration {
	async up({
		copyTable,
		escape,
		queryRunner,
		schemaBuilder: { createTable, column, dropTable },
	}: MigrationContext) {
		// The subject_id is part of a composite primary key, so we cannot simply change the column type.
		// Instead, we create a new temporary table with the updated column type, copy the data over,
		// drop the old table, and rename the temporary table to the original name.

		// At the time of the writing of this migration, there is no table using this table in a foreign key constraint.
		// Thus it is safe to drop and recreate it.
		const escapedTableName = escape.tableName(tableName);
		const escapedTmpTableName = escape.tableName(tmpTableName);

		// createTable handles escaping and prefixing
		await createTable(tmpTableName)
			.withColumns(
				column('credential_id').varchar(16).primary.notNull,
				column('subject_id').varchar(2048).primary.notNull,
				column('resolver_id').varchar(16).primary.notNull,
				column('data').text.notNull,
			)
			.withTimestamps.withForeignKey('credential_id', {
				tableName: 'credentials_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('resolver_id', {
				tableName: 'dynamic_credential_resolver',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withIndexOn(['subject_id'])
			.withIndexOn(['resolver_id']);

		// copyTable handles escaping and prefixing
		await copyTable(tableName, tmpTableName);

		await dropTable(tableName);

		await queryRunner.query(`ALTER TABLE ${escapedTmpTableName} RENAME TO ${escapedTableName};`);
	}
}
