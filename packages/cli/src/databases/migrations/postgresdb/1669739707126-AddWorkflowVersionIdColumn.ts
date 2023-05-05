import { MigrationInterface, QueryRunner } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { getTablePrefix, logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';

export class AddWorkflowVersionIdColumn1669739707126 implements MigrationInterface {
	name = 'AddWorkflowVersionIdColumn1669739707126';

	async up(queryRunner: QueryRunner) {
		logMigrationStart(this.name);

		const tablePrefix = getTablePrefix();
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_entity ADD COLUMN "versionId" CHAR(36)`,
		);

		const workflowIds: Array<{ id: number }> = await queryRunner.query(`
			SELECT id
			FROM ${tablePrefix}workflow_entity
		`);

		workflowIds.map(({ id }) => {
			const [updateQuery, updateParams] = queryRunner.connection.driver.escapeQueryWithParameters(
				`
					UPDATE ${tablePrefix}workflow_entity
					SET "versionId" = :versionId
					WHERE id = '${id}'
				`,
				{ versionId: uuidv4() },
				{},
			);

			return queryRunner.query(updateQuery, updateParams);
		});

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner) {
		const tablePrefix = getTablePrefix();
		await queryRunner.query(`ALTER TABLE ${tablePrefix}workflow_entity DROP COLUMN "versionId"`);
	}
}
