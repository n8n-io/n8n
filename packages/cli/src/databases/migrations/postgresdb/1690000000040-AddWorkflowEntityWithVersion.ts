import type { MigrationContext, ReversibleMigration } from '@db/types';

export class AddWorkflowEntityWithVersion1690000000040 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix, schemaPrefix }: MigrationContext) {
		// Create a new table that behaves like workflow_entity
		await queryRunner.query(
			`CREATE TABLE ${tablePrefix}workflow_entity_with_version (LIKE ${tablePrefix}workflow_entity)`,
		);

		// Add a unique constraint to avoid duplicated data
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_entity_with_version ADD CONSTRAINT unique_version_id UNIQUE ("versionId")`,
		);

		// Create a function that is inserting every row from workflow_entity to workflow_entity_with_version
		await queryRunner.query(
			`CREATE FUNCTION ${tablePrefix}duplicate_data_function()
			RETURNS TRIGGER AS $$
			BEGIN
				INSERT INTO ${schemaPrefix}.${tablePrefix}workflow_entity_with_version SELECT NEW.* ON CONFLICT DO NOTHING;
				RETURN NEW;
			END;
			$$ LANGUAGE plpgsql;`,
		);

		// Create an insertion trigger
		await queryRunner.query(
			`CREATE TRIGGER duplicate_insert_trigger
			AFTER INSERT ON ${tablePrefix}workflow_entity
			FOR EACH ROW
			EXECUTE FUNCTION ${tablePrefix}duplicate_data_function();`,
		);

		// Create an update trigger
		await queryRunner.query(
			`CREATE TRIGGER duplicate_update_trigger
			AFTER UPDATE ON ${tablePrefix}workflow_entity
			FOR EACH ROW
			EXECUTE FUNCTION ${tablePrefix}duplicate_data_function();`,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`DROP TRIGGER duplicate_insert_trigger ON ${tablePrefix}workflow_entity`,
		);
		await queryRunner.query(
			`DROP TRIGGER duplicate_update_trigger ON ${tablePrefix}workflow_entity`,
		);
		await queryRunner.query(`DROP FUNCTION ${tablePrefix}duplicate_data_function() CASCADE`);
		await queryRunner.query(`DROP TABLE ${tablePrefix}workflow_entity_with_version CASCADE`);
	}
}
