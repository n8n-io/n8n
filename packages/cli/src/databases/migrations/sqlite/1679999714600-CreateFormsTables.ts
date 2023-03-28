import { MigrationInterface, QueryRunner } from 'typeorm';
import { getTablePrefix, logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';

export class CreateForms1679999714600 implements MigrationInterface {
	name = 'CreateForms1679999714600';

	public async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);
		const tablePrefix = getTablePrefix();

		await queryRunner.query(
			`CREATE TABLE IF NOT EXISTS "${tablePrefix}forms" (
				id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
				title TEXT NOT NULL,
				schema JSON NOT NULL
			);`,
		);

		await queryRunner.query(
			`CREATE TABLE IF NOT EXISTS "${tablePrefix}form_workflow" (` +
				`"workflowId"	integer NOT NULL,` +
				`"formId"	integer NOT NULL,` +
				`"createdAt"	datetime(3) NOT NULL DEFAULT 'STRFTIME(''%Y-%m-%d %H:%M:%f'', ''NOW'')',` +
				`"updatedAt"	datetime(3) NOT NULL DEFAULT 'STRFTIME(''%Y-%m-%d %H:%M:%f'', ''NOW'')',` +
				`PRIMARY KEY("workflowId", "formId"), ` +
				`CONSTRAINT "FK_${tablePrefix}00000000000001234" FOREIGN KEY ("workflowId") REFERENCES "${tablePrefix}workflow_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, ` +
				`CONSTRAINT "FK_${tablePrefix}00000000000001234" FOREIGN KEY ("formId") REFERENCES "${tablePrefix}forms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION ` +
				`);`,
		);

		logMigrationEnd(this.name);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {}
}
