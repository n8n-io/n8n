import type { MigrationContext, ReversibleMigration } from '@db/types';

export class UniqueWorkflowNames1620821879465 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		const workflowNames = (await queryRunner.query(`
			SELECT name
			FROM "${tablePrefix}workflow_entity"
		`)) as Array<{ name: string }>;

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

			const duplicates = (await queryRunner.query(duplicatesQuery, parameters)) as Array<{
				id: number;
				name: string;
			}>;

			if (duplicates.length > 1) {
				await Promise.all(
					// eslint-disable-next-line @typescript-eslint/no-shadow
					duplicates.map(async ({ id, name }, index: number) => {
						if (index === 0) return;
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
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`DROP INDEX "IDX_${tablePrefix}943d8f922be094eb507cb9a7f9"`);
	}
}
