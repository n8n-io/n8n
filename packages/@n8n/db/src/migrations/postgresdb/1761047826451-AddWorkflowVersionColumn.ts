import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * PostgreSQL-specific migration to add versionCounter column and trigger for auto-incrementing.
 */
export class AddWorkflowVersionColumn1761047826451 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		const tableName = `${tablePrefix}workflow_entity`;
		const triggerName = `${tablePrefix}workflow_version_increment`;
		const functionName = `${tablePrefix}increment_workflow_version`;

		// Add versionCounter column
		await queryRunner.query(
			`ALTER TABLE ${tableName} ADD COLUMN "versionCounter" integer NOT NULL DEFAULT 1`,
		);

		// Create function that increments version counter.
		// NOTE: we're modifying the NEW record before the update happens, so we do it BEFORE the update.
		await queryRunner.query(`
			CREATE OR REPLACE FUNCTION ${functionName}()
			RETURNS TRIGGER AS $$
			BEGIN
				IF NEW."versionCounter" IS NOT DISTINCT FROM OLD."versionCounter" THEN
					NEW."versionCounter" = OLD."versionCounter" + 1;
				END IF;
				RETURN NEW;
			END;
			$$ LANGUAGE plpgsql;
		`);

		// Create trigger that calls the function before update
		await queryRunner.query(`
			CREATE TRIGGER ${triggerName}
			BEFORE UPDATE ON ${tableName}
			FOR EACH ROW
			EXECUTE FUNCTION ${functionName}();
		`);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		const tableName = `${tablePrefix}workflow_entity`;
		const triggerName = `${tablePrefix}workflow_version_increment`;
		const functionName = `${tablePrefix}increment_workflow_version`;

		// Drop trigger and function
		await queryRunner.query(`DROP TRIGGER IF EXISTS ${triggerName} ON ${tableName}`);
		await queryRunner.query(`DROP FUNCTION IF EXISTS ${functionName}`);

		// Drop column
		await queryRunner.query(`ALTER TABLE ${tableName} DROP COLUMN "versionCounter"`);
	}
}
