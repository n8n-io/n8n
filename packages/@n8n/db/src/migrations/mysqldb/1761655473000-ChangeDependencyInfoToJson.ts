import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/**
 * MySQL-specific migration to change the `dependencyInfo` column in `workflow_dependency` table from VARCHAR(255) to JSON.
 * Handles both MySQL and MariaDB.
 */
export class ChangeDependencyInfoToJson1761655473000 implements IrreversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		const tableName = `${tablePrefix}workflow_dependency`;

		await queryRunner.query(
			`ALTER TABLE \`${tableName}\` MODIFY COLUMN \`dependencyInfo\` JSON NULL COMMENT 'Additional info about the dependency, interpreted based on type'`,
		);
	}
}
