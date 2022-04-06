import { MigrationInterface, QueryRunner } from 'typeorm';
import config = require('../../../../config');

export class UniqueWorkflowNames1620824779533 implements MigrationInterface {
	name = 'UniqueWorkflowNames1620824779533';

	async up(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.get('database.tablePrefix');
		const tablePrefixPure = tablePrefix;
		const schema = config.get('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}

		const workflowNames = await queryRunner.query(`
				SELECT name
				FROM ${tablePrefix}workflow_entity
			`);

		for (const { name } of workflowNames) {
			const [duplicatesQuery, parameters] = queryRunner.connection.driver.escapeQueryWithParameters(
				`
					SELECT id, name
					FROM ${tablePrefix}workflow_entity
					WHERE name = :name
					ORDER BY "createdAt" ASC
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
							UPDATE ${tablePrefix}workflow_entity
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
			`CREATE UNIQUE INDEX "IDX_${tablePrefixPure}a252c527c4c89237221fe2c0ab" ON ${tablePrefix}workflow_entity ("name") `,
		);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.get('database.tablePrefix');
		const tablePrefixPure = tablePrefix;
		const schema = config.get('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}

		await queryRunner.query(`DROP INDEX "IDX_${tablePrefixPure}a252c527c4c89237221fe2c0ab"`);
	}
}
