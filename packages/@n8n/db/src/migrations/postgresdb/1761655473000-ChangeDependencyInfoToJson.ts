import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/**
 * PostgreSQL-specific migration to change the `dependencyInfo` column in `workflow_dependency` table from VARCHAR(255) to JSON.
 */
export class ChangeDependencyInfoToJson1761655473000 implements IrreversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		const tableName = `${tablePrefix}workflow_dependency`;

		await queryRunner.query(
			`ALTER TABLE "${tableName}" ALTER COLUMN "dependencyInfo" TYPE JSON USING NULL`,
		);
	}
}
