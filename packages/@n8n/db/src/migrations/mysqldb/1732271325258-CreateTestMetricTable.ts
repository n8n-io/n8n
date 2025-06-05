import assert from 'node:assert';

import type { MigrationContext, ReversibleMigration } from '../migration-types';

const testMetricEntityTableName = 'test_metric';

export class CreateTestMetricTable1732271325258 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column }, queryRunner, tablePrefix }: MigrationContext) {
		// Check if the previous migration MigrateTestDefinitionKeyToString1731582748663 properly updated the primary key
		const table = await queryRunner.getTable(`${tablePrefix}test_definition`);
		assert(table, 'test_definition table not found');

		const brokenPrimaryColumn = table.primaryColumns.some(
			(c) => c.name === 'tmp_id' && c.isPrimary,
		);

		if (brokenPrimaryColumn) {
			// The migration was completed, but left the table in inconsistent state, let's finish the primary key change
			await queryRunner.query(
				`ALTER TABLE ${tablePrefix}test_definition MODIFY COLUMN tmp_id INT NOT NULL;`,
			);
			await queryRunner.query(
				`ALTER TABLE ${tablePrefix}test_definition DROP PRIMARY KEY, ADD PRIMARY KEY (\`id\`);`,
			);
			await queryRunner.query(
				`DROP INDEX \`TMP_idx_${tablePrefix}test_definition_id\` ON ${tablePrefix}test_definition;`,
			);
			await queryRunner.query(`ALTER TABLE ${tablePrefix}test_definition DROP COLUMN tmp_id;`);
		}
		// End of test_definition PK check

		await createTable(testMetricEntityTableName)
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('name').varchar(255).notNull,
				column('testDefinitionId').varchar(36).notNull,
			)
			.withIndexOn('testDefinitionId')
			.withForeignKey('testDefinitionId', {
				tableName: 'test_definition',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(testMetricEntityTableName);
	}
}
