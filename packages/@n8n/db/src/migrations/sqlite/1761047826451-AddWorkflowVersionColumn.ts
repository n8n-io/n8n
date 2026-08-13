import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * SQLite-specific migration to add versionCounter column and trigger for auto-incrementing.
 */
export class AddWorkflowVersionColumn1761047826451 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		const tableName = `${tablePrefix}workflow_entity`;
		const triggerName = `${tablePrefix}workflow_version_increment`;

		// Add versionCounter column
		await queryRunner.query(
			`ALTER TABLE ${tableName} ADD COLUMN "versionCounter" integer NOT NULL DEFAULT 1`,
		);

		// Create trigger that increments version counter on update.
		// NOTE: we perform the version counter bump AFTER so it isn't overwritten by the original update.
		await queryRunner.query(`
			CREATE TRIGGER ${triggerName}
			AFTER UPDATE ON ${tableName}
			FOR EACH ROW
			WHEN OLD."versionCounter" = NEW."versionCounter"
			BEGIN
				UPDATE ${tableName}
				SET "versionCounter" = "versionCounter" + 1
				WHERE id = NEW.id;
			END;
		`);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		const tableName = `${tablePrefix}workflow_entity`;
		const triggerName = `${tablePrefix}workflow_version_increment`;

		// Drop trigger
		await queryRunner.query(`DROP TRIGGER IF EXISTS ${triggerName}`);

		// Drop column
		await queryRunner.query(`ALTER TABLE ${tableName} DROP COLUMN "versionCounter"`);
	}
}
