import type { MigrationContext, ReversibleMigration } from '@db/types';
import { v4 as uuidv4 } from 'uuid';

export class AddWorkflowVersionIdColumn1669739707124 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}workflow_entity\` ADD COLUMN "versionId" char(36)`,
		);

		const workflowIds = (await queryRunner.query(`
			SELECT id
			FROM "${tablePrefix}workflow_entity"
		`)) as Array<{ id: number }>;

		for (const { id } of workflowIds) {
			const [updateQuery, updateParams] = queryRunner.connection.driver.escapeQueryWithParameters(
				`UPDATE "${tablePrefix}workflow_entity"
				 SET versionId = :versionId
				 WHERE id = '${id}'`,
				{ versionId: uuidv4() },
				{},
			);

			await queryRunner.query(updateQuery, updateParams);
		}
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}workflow_entity\` DROP COLUMN "versionId"`,
		);
	}
}
