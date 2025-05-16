import assert from 'node:assert';

import type { MigrationContext, IrreversibleMigration } from '../migration-types';

export class FixTestDefinitionPrimaryKey1739873751194 implements IrreversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		/**
		 * MigrateTestDefinitionKeyToString migration for MySQL/MariaDB had missing part,
		 * and didn't complete primary key type change and deletion of the temporary column.
		 *
		 * This migration checks if table is in inconsistent state and finishes the primary key type change when needed.
		 *
		 * The MigrateTestDefinitionKeyToString migration has been patched to properly change the primary key.
		 *
		 * As the primary key issue might prevent the CreateTestMetricTable migration from running successfully on MySQL 8.4.4,
		 * the CreateTestMetricTable also contains the patch.
		 *
		 * For users who already ran the MigrateTestDefinitionKeyToString and CreateTestMetricTable, this migration should fix the primary key.
		 * For users who run these migrations in the same batch, this migration would be no-op, as the test_definition table should be already fixed
		 * by either of the previous patched migrations.
		 */

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
	}
}
