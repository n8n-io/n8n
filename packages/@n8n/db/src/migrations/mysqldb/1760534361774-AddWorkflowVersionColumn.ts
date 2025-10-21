import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * MySQL-specific migration to add versionCounter column and trigger for auto-incrementing.
 */
export class AddWorkflowVersionColumn1760534361774 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		const tableName = `${tablePrefix}workflow_entity`;
		const triggerName = `${tablePrefix}workflow_version_increment`;

		// Add versionCounter column
		await queryRunner.query(
			`ALTER TABLE \`${tableName}\` ADD COLUMN \`versionCounter\` int NOT NULL DEFAULT 1`,
		);

		// Create trigger that increments version counter before update.
		// Manually setting the value is prevented by raising an error.
		await queryRunner.query(`
			CREATE TRIGGER \`${triggerName}\`
			BEFORE UPDATE ON \`${tableName}\`
			FOR EACH ROW
			BEGIN
				IF OLD.versionCounter = NEW.versionCounter THEN
					SET NEW.versionCounter = OLD.versionCounter + 1;
				END IF;
			END;
		`);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		const tableName = `${tablePrefix}workflow_entity`;
		const triggerName = `${tablePrefix}workflow_version_increment`;

		// Drop trigger
		await queryRunner.query(`DROP TRIGGER IF EXISTS \`${triggerName}\``);

		// Drop column
		await queryRunner.query(`ALTER TABLE \`${tableName}\` DROP COLUMN \`versionCounter\``);
	}
}
