import { MigrationInterface, QueryRunner } from 'typeorm';
import config from '@/config';
import { logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';

export class UniqueWorkflowNames1620821879465 implements MigrationInterface {
	name = 'UniqueWorkflowNames1620821879465';

	async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);

		const tablePrefix = config.getEnv('database.tablePrefix');

		const workflowNames = await queryRunner.query(`
				SELECT name
				FROM "${tablePrefix}workflow_entity"
			`);

		for (const { name } of workflowNames) {
			const [duplicatesQuery, parameters] = queryRunner.connection.driver.escapeQueryWithParameters(
				`
					SELECT id, name
					FROM "${tablePrefix}workflow_entity"
					WHERE name = :name
					ORDER BY createdAt ASC
				`,
				{ name },
				{},
			);

			const duplicates = await queryRunner.query(duplicatesQuery, parameters);

			if (duplicates.length > 1) {
				await Promise.all(
					duplicates.map(({ id, name }: { id: number; name: string }, index: number) => {
						if (index === 0) return Promise.resolve();
						const [updateQuery, updateParams] =
							queryRunner.connection.driver.escapeQueryWithParameters(
								`
							UPDATE "${tablePrefix}workflow_entity"
							SET name = :name
							WHERE id = '${id}'
						`,
								{ name: `${name} ${index + 1}` },
								{},
							);

						return queryRunner.query(updateQuery, updateParams);
					}),
				);
			}
		}

		await queryRunner.query(
			`CREATE UNIQUE INDEX "IDX_${tablePrefix}943d8f922be094eb507cb9a7f9" ON "${tablePrefix}workflow_entity" ("name") `,
		);

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.getEnv('database.tablePrefix');
		await queryRunner.query(`DROP INDEX "IDX_${tablePrefix}943d8f922be094eb507cb9a7f9"`);
	}
}
