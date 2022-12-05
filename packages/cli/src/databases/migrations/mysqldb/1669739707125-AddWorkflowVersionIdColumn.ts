import { MigrationInterface, QueryRunner } from 'typeorm';
import { logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';
import config from '@/config';
import { v4 as uuidv4 } from 'uuid';

export class AddWorkflowVersionIdColumn1669739707125 implements MigrationInterface {
	name = 'AddWorkflowVersionIdColumn1669739707125';

	async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);

		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_entity ADD COLUMN versionId CHAR(36)`,
		);

		const workflowIds: Array<{ id: number }> = await queryRunner.query(`
			SELECT id
			FROM ${tablePrefix}workflow_entity
		`);

		workflowIds.map(({ id }) => {
			const [updateQuery, updateParams] = queryRunner.connection.driver.escapeQueryWithParameters(
				`
					UPDATE ${tablePrefix}workflow_entity
					SET versionId = :versionId
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
		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(`ALTER TABLE ${tablePrefix}workflow_entity DROP COLUMN versionId`);
	}
}
