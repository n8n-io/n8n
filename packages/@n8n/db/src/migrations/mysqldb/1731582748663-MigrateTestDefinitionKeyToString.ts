import type { MigrationContext, IrreversibleMigration } from '../migration-types';

export class MigrateTestDefinitionKeyToString1731582748663 implements IrreversibleMigration {
	async up(context: MigrationContext) {
		const { queryRunner, tablePrefix } = context;

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}test_definition CHANGE id tmp_id int NOT NULL AUTO_INCREMENT;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}test_definition ADD COLUMN id varchar(36) NOT NULL;`,
		);
		await queryRunner.query(`UPDATE ${tablePrefix}test_definition SET id = CONVERT(tmp_id, CHAR);`);
		await queryRunner.query(
			`CREATE INDEX \`TMP_idx_${tablePrefix}test_definition_id\` ON ${tablePrefix}test_definition (\`id\`);`,
		);

		// Note: this part was missing in initial release and was added after. Without it the migration run successfully,
		// but left the table in inconsistent state, because it didn't finish changing the primary key and deleting the old one.
		// This prevented the next migration from running on MySQL 8.4.4
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
