import type { MigrationContext, IrreversibleMigration } from '@/databases/types';

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
	}
}
