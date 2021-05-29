import {MigrationInterface, QueryRunner} from "typeorm";
import config = require("../../../../config");

export class UniqueWorkflowNames1620826335440 implements MigrationInterface {
		name = 'UniqueWorkflowNames1620826335440';

		async up(queryRunner: QueryRunner): Promise<void> {
			const tablePrefix = config.get('database.tablePrefix');

			const workflowNames = await queryRunner.query(`
				SELECT name
				FROM ${tablePrefix}workflow_entity
			`);

			for (const { name } of workflowNames) {

				const duplicates = await queryRunner.query(`
					SELECT id, name
					FROM ${tablePrefix}workflow_entity
					WHERE name = '${name}'
					ORDER BY createdAt ASC
				`);

				if (duplicates.length > 1) {

					await Promise.all(duplicates.map(({ id, name }: { id: number; name: string; }, index: number) => {
						if (index === 0) return Promise.resolve();
						return queryRunner.query(`
							UPDATE ${tablePrefix}workflow_entity
							SET name = '${name} ${index + 1}'
							WHERE id = '${id}'
						`);
					}));

				}

			}

			await queryRunner.query('ALTER TABLE `' + tablePrefix + 'workflow_entity` ADD UNIQUE INDEX `IDX_' + tablePrefix + '943d8f922be094eb507cb9a7f9` (`name`)');
		}

		async down(queryRunner: QueryRunner): Promise<void> {
			const tablePrefix = config.get('database.tablePrefix');

			await queryRunner.query('ALTER TABLE `' + tablePrefix + 'workflow_entity` DROP INDEX `IDX_' + tablePrefix + '943d8f922be094eb507cb9a7f9`');
		}

}
