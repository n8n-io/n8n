import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/**
 * SQLite-specific migration to change the `dependencyInfo` column in `workflow_dependency` table from VARCHAR(255) to JSON.
 * SQLite doesn't support ALTER COLUMN, so we drop and recreate the column.
 * Since the table is empty at this point, this is safe.
 */
export class ChangeDependencyInfoToJson1761655473000 implements IrreversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		const tableName = `${tablePrefix}workflow_dependency`;

		// SQLite doesn't support ALTER COLUMN, so drop and recreate the column
		await queryRunner.query(`ALTER TABLE "${tableName}" DROP COLUMN "dependencyInfo"`);
		await queryRunner.query(
			`ALTER TABLE "${tableName}" ADD COLUMN "dependencyInfo" TEXT CONSTRAINT workflow_dependency_chk_dependency_info_is_json CHECK("dependencyInfo" IS NULL OR json_valid("dependencyInfo"))`,
		);
	}
}
